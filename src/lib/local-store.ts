import {
  mkdir,
  readFile,
  open,
  rename,
  unlink,
  copyFile,
  readdir,
} from "node:fs/promises";
import { resolve, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { z } from "zod";
import {
  CONTRACTS,
  DEFAULT_SETTINGS,
  validateTrade,
  type Trade,
  type JournalEntry,
  type Screenshot,
} from "./calculations.ts";
import {
  tradeInput,
  journalInput,
  settingsInput,
  specInput,
} from "./schemas.ts";

const screenshotSchema = z.object({
  id: z.uuid(),
  object_path: z.string(),
  caption: z.string().max(1000),
});
const settingsSchema = settingsInput.omit({ display_name: true });
const databaseSchema = z.object({
  version: z.literal(1),
  profile: z.object({ display_name: z.string() }),
  settings: settingsSchema,
  specs: z.array(specInput.extend({ id: z.string().optional() })),
  trades: z.array(
    tradeInput.extend({
      user_id: z.literal("local"),
      tick_size: z.number().positive(),
      point_value: z.number().positive(),
      created_at: z.string(),
      updated_at: z.string(),
      trade_screenshots: z.array(screenshotSchema).default([]),
    }),
  ),
  journals: z.array(
    journalInput.extend({
      journal_screenshots: z.array(screenshotSchema).default([]),
    }),
  ),
});
export type LocalDatabase = z.infer<typeof databaseSchema>;
const missing = (error: unknown) =>
  (error as NodeJS.ErrnoException).code === "ENOENT";
const initial = (): LocalDatabase => ({
  version: 1,
  profile: { display_name: "My journal" },
  settings: settingsSchema.parse(DEFAULT_SETTINGS),
  specs: CONTRACTS.map((s) => ({ ...s })),
  trades: [],
  journals: [],
});
const uuid = (value: string) => z.uuid().parse(value);
type ImageInput = {
  kind: "trade" | "journal";
  recordId: string;
  id: string;
  caption: string;
  mime: string;
  bytes: Uint8Array;
};
function imageType(bytes: Uint8Array, mime: string): string {
  const b = Buffer.from(bytes);
  if (
    mime === "image/png" &&
    b.length >= 8 &&
    b.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))
  )
    return "png";
  if (
    mime === "image/jpeg" &&
    b.length >= 3 &&
    b[0] === 255 &&
    b[1] === 216 &&
    b[2] === 255
  )
    return "jpg";
  if (
    mime === "image/webp" &&
    b.length >= 12 &&
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "WEBP"
  )
    return "webp";
  throw new Error("Choose a valid PNG, JPG, or WebP image.");
}
export class LocalStore {
  readonly directory: string;
  constructor(directory: string) {
    this.directory = resolve(directory);
  }
  async read(): Promise<LocalDatabase> {
    let source: string;
    try {
      source = await readFile(join(this.directory, "journal.json"), "utf8");
    } catch (error) {
      if (missing(error)) return initial();
      throw new Error(
        "Could not read your local journal. Check folder permissions.",
      );
    }
    try {
      return databaseSchema.parse(JSON.parse(source));
    } catch {
      throw new Error(
        "Your local journal file is corrupt or unsupported. It was not changed. Restore a backup of your data folder; journal.json.bak contains the previous metadata snapshot.",
      );
    }
  }
  private async recoverLock(path: string) {
    const recoveryPath = join(this.directory, ".recovery.lock");
    let guard;
    try {
      guard = await open(recoveryPath, "wx", 0o600);
    } catch (error) {
      if (
        ["EEXIST", "EPERM", "EACCES", "EBUSY"].includes(
          (error as NodeJS.ErrnoException).code || "",
        )
      )
        return;
      throw error;
    }
    try {
      let owner: { pid: number };
      try {
        owner = JSON.parse(await readFile(path, "utf8"));
      } catch {
        return;
      }
      if (!Number.isSafeInteger(owner.pid) || owner.pid <= 0) return;
      let dead = false;
      try {
        process.kill(owner.pid, 0);
      } catch (error) {
        dead = (error as NodeJS.ErrnoException).code === "ESRCH";
      }
      if (dead)
        await unlink(path).catch((error) => {
          if (!missing(error)) throw error;
        });
    } finally {
      await guard.close();
      await unlink(recoveryPath);
    }
  }
  private async lock() {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const path = join(this.directory, ".write.lock");
    const deadline = Date.now() + 10000;
    while (true) {
      try {
        const handle = await open(path, "wx", 0o600);
        try {
          await handle.writeFile(JSON.stringify({ pid: process.pid }));
        } catch (error) {
          await handle.close();
          await unlink(path);
          throw error;
        }
        return async () => {
          await handle.close();
          await unlink(path);
        };
      } catch (error) {
        if (
          !["EEXIST", "EPERM", "EACCES", "EBUSY"].includes(
            (error as NodeJS.ErrnoException).code || "",
          )
        )
          throw error;
        await this.recoverLock(path);
        if (Date.now() > deadline)
          throw new Error(
            "Your journal is busy in another process. Close other journal windows and retry.",
          );
        await delay(15);
      }
    }
  }
  private async mutate<T>(
    operation: (data: LocalDatabase) => T | Promise<T>,
    backup: "previous" | "current" = "previous",
  ): Promise<T> {
    const release = await this.lock();
    const temporary = join(
      this.directory,
      `.journal-${crypto.randomUUID()}.tmp`,
    );
    try {
      const data = await this.read();
      const result = await operation(data);
      databaseSchema.parse(data);
      const target = join(this.directory, "journal.json");
      const backupTemporary = temporary + ".bak";
      try {
        if (backup === "current") {
          const backupHandle = await open(backupTemporary, "wx", 0o600);
          try {
            await backupHandle.writeFile(JSON.stringify(data, null, 2));
            await backupHandle.sync();
          } finally {
            await backupHandle.close();
          }
        } else await copyFile(target, backupTemporary);
        await rename(backupTemporary, join(this.directory, "journal.json.bak"));
      } catch (error) {
        if (!missing(error)) throw error;
      }
      const handle = await open(temporary, "wx", 0o600);
      try {
        await handle.writeFile(JSON.stringify(data, null, 2));
        await handle.sync();
      } finally {
        await handle.close();
      }
      await rename(temporary, target);
      return result;
    } finally {
      await unlink(temporary).catch(() => {});
      await release();
    }
  }
  async saveTrade(input: unknown): Promise<string> {
    const parsed = tradeInput.parse(input);
    return this.mutate((data) => {
      const existing = data.trades.find((t) => t.id === parsed.id);
      if (
        data.trades.some(
          (t) => t.submission_id === parsed.submission_id && t.id !== parsed.id,
        )
      )
        throw new Error("This submission has already been saved.");
      const spec =
        existing?.symbol === parsed.symbol
          ? existing
          : data.specs.find((s) => s.symbol === parsed.symbol);
      if (!spec) throw new Error("Choose an available instrument.");
      const now = new Date().toISOString();
      const trade = {
        ...parsed,
        user_id: "local" as const,
        tick_size: spec.tick_size,
        point_value: spec.point_value,
        submission_id: existing?.submission_id || parsed.submission_id,
        created_at: existing?.created_at || now,
        updated_at: now,
        trade_screenshots: existing?.trade_screenshots || [],
      };
      const errors = validateTrade(trade);
      if (errors.length) throw new Error(errors.join(" "));
      data.trades = data.trades.filter((t) => t.id !== trade.id);
      data.trades.push(trade);
      return trade.id;
    });
  }
  async saveJournal(input: unknown): Promise<string> {
    const parsed = journalInput.parse(input);
    return this.mutate((data) => {
      if (
        data.journals.some(
          (j) => j.entry_date === parsed.entry_date && j.id !== parsed.id,
        )
      )
        throw new Error(
          "A reflection already exists for this date. Open it to edit.",
        );
      const previous = data.journals.find((j) => j.id === parsed.id);
      data.journals = data.journals.filter((j) => j.id !== parsed.id);
      data.journals.push({
        ...parsed,
        journal_screenshots: previous?.journal_screenshots || [],
      });
      return parsed.id;
    });
  }
  async saveSettings(input: unknown) {
    const { display_name, ...settings } = settingsInput.parse(input);
    await this.mutate((data) => {
      data.profile = { display_name };
      data.settings = settings;
    });
  }
  async addInstrument(input: unknown) {
    const spec = specInput.parse(input);
    await this.mutate((data) => {
      if (data.specs.some((s) => s.symbol === spec.symbol))
        throw new Error("An instrument already uses that symbol.");
      data.specs.push({ ...spec, id: crypto.randomUUID() });
    });
  }
  private attachments(data: LocalDatabase) {
    return [
      ...data.trades.flatMap((t) => t.trade_screenshots),
      ...data.journals.flatMap((j) => j.journal_screenshots),
    ];
  }
  private imagePath(image: Screenshot) {
    const extension = image.object_path.split(".").at(-1);
    if (!["png", "jpg", "webp"].includes(extension || ""))
      throw new Error("Invalid image path.");
    return join(
      this.directory,
      "screenshots",
      `${uuid(image.id)}.${extension}`,
    );
  }
  async saveScreenshot(input: ImageInput) {
    const kind = z.enum(["trade", "journal"]).parse(input.kind);
    uuid(input.recordId);
    uuid(input.id);
    z.string().max(1000).parse(input.caption);
    const extension = imageType(input.bytes, input.mime);
    await this.mutate(async (data) => {
      const parent =
        kind === "trade"
          ? data.trades.find((t) => t.id === input.recordId)
          : data.journals.find((j) => j.id === input.recordId);
      if (!parent)
        throw new Error(
          "The trade or reflection was not found. Save it before attaching an image.",
        );
      if (
        !input.bytes.length ||
        input.bytes.length > data.settings.screenshot_limit_mb * 1024 * 1024
      )
        throw new Error(
          `Images must be under ${data.settings.screenshot_limit_mb} MB.`,
        );
      const object_path = `local/${kind}/${input.recordId}/${input.id}.${extension}`;
      const existing = this.attachments(data).find((i) => i.id === input.id);
      if (existing) {
        if (existing.object_path !== object_path)
          throw new Error("Image identity belongs to another record.");
        const saved = await readFile(this.imagePath(existing));
        if (!saved.equals(Buffer.from(input.bytes)))
          throw new Error("This image identity is already used.");
        existing.caption = input.caption;
        return;
      }
      const image = { id: input.id, object_path, caption: input.caption };
      await mkdir(join(this.directory, "screenshots"), {
        recursive: true,
        mode: 0o700,
      });
      const imageHandle = await open(this.imagePath(image), "w", 0o600);
      try {
        await imageHandle.writeFile(input.bytes);
        await imageHandle.sync();
      } finally {
        await imageHandle.close();
      }
      if (kind === "trade") (parent as Trade).trade_screenshots!.push(image);
      else (parent as JournalEntry).journal_screenshots!.push(image);
    });
  }
  async getScreenshot(id: string) {
    uuid(id);
    const image = this.attachments(await this.read()).find((i) => i.id === id);
    if (!image) throw new Error("Screenshot not found.");
    let bytes: Buffer;
    try {
      bytes = await readFile(this.imagePath(image));
    } catch {
      throw new Error(
        "Screenshot file not found. Restore it from a folder backup.",
      );
    }
    return {
      bytes,
      mime: image.object_path.endsWith(".png")
        ? "image/png"
        : image.object_path.endsWith(".webp")
          ? "image/webp"
          : "image/jpeg",
    };
  }
  async updateCaption(kind: "trade" | "journal", id: string, caption: string) {
    uuid(id);
    z.enum(["trade", "journal"]).parse(kind);
    z.string().max(1000).parse(caption);
    await this.mutate((data) => {
      const images =
        kind === "trade"
          ? data.trades.flatMap((t) => t.trade_screenshots)
          : data.journals.flatMap((j) => j.journal_screenshots);
      const image = images.find((i) => i.id === id);
      if (!image) throw new Error("Screenshot not found.");
      image.caption = caption;
    });
  }
  private async removeFiles(images: Screenshot[]) {
    for (const image of images) {
      try {
        await unlink(this.imagePath(image));
      } catch (error) {
        if (!missing(error))
          throw new Error(
            "Records were removed, but a screenshot file could not be deleted. Check data folder permissions.",
          );
      }
    }
  }
  async deleteScreenshot(kind: "trade" | "journal", id: string) {
    uuid(id);
    z.enum(["trade", "journal"]).parse(kind);
    const images = await this.mutate((data) => {
      const removed: Screenshot[] = [];
      if (kind === "trade")
        data.trades.forEach((t) => {
          removed.push(...t.trade_screenshots.filter((i) => i.id === id));
          t.trade_screenshots = t.trade_screenshots.filter((i) => i.id !== id);
        });
      else
        data.journals.forEach((j) => {
          removed.push(...j.journal_screenshots.filter((i) => i.id === id));
          j.journal_screenshots = j.journal_screenshots.filter(
            (i) => i.id !== id,
          );
        });
      return removed;
    }, "current");
    await this.removeFiles(images);
  }
  async deleteTrade(id: string) {
    uuid(id);
    const images = await this.mutate((data) => {
      const images =
        data.trades.find((t) => t.id === id)?.trade_screenshots || [];
      data.trades = data.trades.filter((t) => t.id !== id);
      return images;
    }, "current");
    await this.removeFiles(images);
  }
  async deleteJournal(id: string) {
    uuid(id);
    const images = await this.mutate((data) => {
      const images =
        data.journals.find((j) => j.id === id)?.journal_screenshots || [];
      data.journals = data.journals.filter((j) => j.id !== id);
      return images;
    }, "current");
    await this.removeFiles(images);
  }
  async deleteAll(confirmation: string) {
    if (confirmation !== "DELETE MY JOURNAL")
      throw new Error("Type DELETE MY JOURNAL to confirm.");
    const files = await this.mutate(async (data) => {
      data.trades = [];
      data.journals = [];
      try {
        return (await readdir(join(this.directory, "screenshots"))).filter(
          (name) => /^[0-9a-f-]{36}\.(png|jpg|webp)$/.test(name),
        );
      } catch (error) {
        if (missing(error)) return [];
        throw error;
      }
    }, "current");
    for (const filename of files) {
      try {
        await unlink(join(this.directory, "screenshots", filename));
      } catch (error) {
        if (!missing(error))
          throw new Error(
            "Journal records deleted, but some image files could not be removed. Retry deletion.",
          );
      }
    }
  }
}
export function localStore() {
  return new LocalStore(
    process.env.FORMA_DATA_DIR || join(process.cwd(), "data"),
  );
}
