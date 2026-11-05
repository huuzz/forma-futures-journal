import {
  mkdir,
  readFile,
  readdir,
  copyFile,
  rename,
  rmdir,
  rm,
  access,
  open,
  unlink,
} from "node:fs/promises";
import { resolve, dirname, basename, join, sep } from "node:path";
import net from "node:net";
import { setTimeout as delay } from "node:timers/promises";
const exists = async (path) => {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
};
export function isJournalNavigation(url, origin) {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}
export function findAvailablePort() {
  return new Promise((resolvePort, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close((error) =>
        error ? reject(error) : resolvePort(address.port),
      );
    });
  });
}
async function lockSource(source) {
  const lockPath = join(source, ".write.lock"),
    deadline = Date.now() + 10000;
  for (;;) {
    try {
      const handle = await open(lockPath, "wx", 0o600);
      try {
        await handle.writeFile(JSON.stringify({ pid: process.pid }));
      } catch (error) {
        await handle.close();
        await unlink(lockPath);
        throw error;
      }
      return async () => {
        await handle.close();
        await unlink(lockPath);
      };
    } catch (error) {
      if (!["EEXIST", "EPERM", "EACCES", "EBUSY"].includes(error.code))
        throw error;
      if (Date.now() > deadline)
        throw new Error(
          "Your browser journal is busy saving. Finish saving and close it, then reopen Forma Journal.",
        );
      await delay(25);
    }
  }
}
export async function prepareDataDirectory(legacyDirectory, targetDirectory) {
  const target = resolve(targetDirectory),
    source = legacyDirectory ? resolve(legacyDirectory) : null;
  if (await exists(join(target, "journal.json"))) return "existing";
  if (
    source &&
    (target === source ||
      target.startsWith(source + sep) ||
      source.startsWith(target + sep))
  )
    throw new Error("Journal source and desktop data folders overlap.");
  if (await exists(target)) {
    if ((await readdir(target)).length)
      throw new Error(
        "Desktop data folder contains files but no journal.json. Restore its journal file before opening the app.",
      );
  }
  if (!source || !(await exists(source))) {
    await mkdir(target, { recursive: true, mode: 0o700 });
    return "new";
  }
  const release = await lockSource(source);
  try {
    if (!(await exists(join(source, "journal.json")))) {
      await mkdir(target, { recursive: true, mode: 0o700 });
      return "new";
    }
    let data;
    try {
      data = JSON.parse(await readFile(join(source, "journal.json"), "utf8"));
    } catch {
      throw new Error(
        "Your existing journal cannot be read. Its files were left unchanged; restore a backup before migrating.",
      );
    }
    if (
      data.version !== 1 ||
      !Array.isArray(data.trades) ||
      !Array.isArray(data.journals)
    )
      throw new Error(
        "Your existing journal format is unsupported; its files were left unchanged.",
      );
    const parent = dirname(target),
      prefix = basename(target) + ".migration-",
      staging = join(parent, prefix + crypto.randomUUID());
    await mkdir(staging, { recursive: true, mode: 0o700 });
    try {
      await copyFile(
        join(source, "journal.json"),
        join(staging, "journal.json"),
      );
      if (await exists(join(source, "journal.json.bak")))
        await copyFile(
          join(source, "journal.json.bak"),
          join(staging, "journal.json.bak"),
        );
      if (await exists(join(source, "screenshots"))) {
        await mkdir(join(staging, "screenshots"));
        for (const entry of await readdir(join(source, "screenshots"), {
          withFileTypes: true,
        })) {
          if (entry.isFile() && /\.(png|jpg|webp)$/i.test(entry.name))
            await copyFile(
              join(source, "screenshots", entry.name),
              join(staging, "screenshots", entry.name),
            );
        }
      }
      if (await exists(target)) await rmdir(target);
      await rename(staging, target);
      return "migrated";
    } catch (error) {
      if (!resolve(staging).startsWith(resolve(parent) + sep + prefix))
        throw new Error("Unsafe migration cleanup path.");
      await rm(staging, { recursive: true, force: true });
      throw error;
    }
  } finally {
    await release();
  }
}
