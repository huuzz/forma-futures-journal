import { test } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalStore } from "../src/lib/local-store.ts";
import type { Trade } from "../src/lib/calculations.ts";
const trade = (id = crypto.randomUUID()): Trade => ({
  id,
  submission_id: id,
  user_id: "local",
  trade_date: "2026-11-05",
  symbol: "NQ",
  tick_size: 0.25,
  point_value: 20,
  direction: "long",
  status: "closed",
  entry_price: 20000,
  stop_price: 19990,
  target_price: 20030,
  exit_price: 20020,
  contracts: 2,
  commission: 4,
  fees: 2,
  adjustment: 0,
  adjustment_reason: "",
  entry_at: "2026-11-05T14:30:00Z",
  exit_at: "2026-11-05T15:00:00Z",
  contract_expiration: null,
  notes: { reason: "Test fixture" },
  emotion_before: "Calm",
  emotion_during: "",
  emotion_after: "",
  confidence: null,
  followed_plan: true,
  mistakes: [],
  created_at: "",
  updated_at: "",
});
test("local journal persists across instances without credentials", async () => {
  const dir = await mkdtemp(join(tmpdir(), "forma-test-"));
  try {
    const store = new LocalStore(dir);
    assert.equal((await store.read()).trades.length, 0);
    const t = trade();
    await store.saveTrade(t);
    const saved = await new LocalStore(dir).read();
    assert.equal(saved.trades.length, 1);
    assert.equal(saved.trades[0].notes.reason, "Test fixture");
    await store.saveTrade({ ...t, notes: { reason: "Updated" } });
    assert.equal((await store.read()).trades.length, 1);
    assert.equal((await store.read()).trades[0].notes.reason, "Updated");
  } finally {
    await cleanTestDirectory(dir);
  }
});
test("concurrent local writes do not lose independent trades", async () => {
  const dir = await mkdtemp(join(tmpdir(), "forma-test-"));
  try {
    const results = await Promise.allSettled(
      Array.from({ length: 12 }, () => new LocalStore(dir).saveTrade(trade())),
    );
    assert.deepEqual(
      results.filter((result) => result.status === "rejected"),
      [],
    );
    assert.equal((await new LocalStore(dir).read()).trades.length, 12);
  } finally {
    await cleanTestDirectory(dir);
  }
});
test("invalid trades and unknown instruments cannot reach disk", async () => {
  const dir = await mkdtemp(join(tmpdir(), "forma-test-"));
  try {
    const store = new LocalStore(dir);
    await assert.rejects(
      store.saveTrade({ ...trade(), stop_price: 20010 }),
      /Stop/,
    );
    await assert.rejects(
      store.saveTrade({ ...trade(), symbol: "UNKNOWN" }),
      /instrument/i,
    );
    assert.equal((await store.read()).trades.length, 0);
  } finally {
    await cleanTestDirectory(dir);
  }
});
test("saved specifications stay unchanged and duplicate submissions cannot create extra records", async () => {
  const dir = await mkdtemp(join(tmpdir(), "forma-test-"));
  try {
    const store = new LocalStore(dir),
      t = trade();
    await store.saveTrade(t);
    await store.saveTrade({ ...t, point_value: 999 });
    assert.equal((await store.read()).trades[0].point_value, 20);
    await assert.rejects(
      store.saveTrade({ ...trade(), submission_id: t.submission_id }),
      /submission/i,
    );
  } finally {
    await cleanTestDirectory(dir);
  }
});
test("one reflection per date is enforced locally and preferences persist", async () => {
  const dir = await mkdtemp(join(tmpdir(), "forma-test-"));
  try {
    const store = new LocalStore(dir);
    await store.saveJournal({
      id: crypto.randomUUID(),
      entry_date: "2026-11-05",
      content: { reflection: "Wait for the plan" },
    });
    await assert.rejects(
      store.saveJournal({
        id: crypto.randomUUID(),
        entry_date: "2026-11-05",
        content: {},
      }),
      /already exists/i,
    );
    await store.saveSettings({
      display_name: "Personal",
      timezone: "America/Chicago",
      currency: "USD",
      theme: "light",
      screenshot_limit_mb: 5,
    });
    assert.equal(
      (await new LocalStore(dir).read()).profile.display_name,
      "Personal",
    );
    assert.equal((await new LocalStore(dir).read()).settings.theme, "light");
  } finally {
    await cleanTestDirectory(dir);
  }
});
test("corrupt data raises an error and is never replaced with an empty journal", async () => {
  const dir = await mkdtemp(join(tmpdir(), "forma-test-"));
  try {
    const store = new LocalStore(dir);
    await store.saveTrade(trade());
    const before = await readFile(join(dir, "journal.json"), "utf8");
    await store.saveTrade(trade());
    assert.equal(await readFile(join(dir, "journal.json.bak"), "utf8"), before);
    await writeFile(join(dir, "journal.json"), "{broken");
    await assert.rejects(store.read(), /corrupt|read/i);
    assert.equal(await readFile(join(dir, "journal.json"), "utf8"), "{broken");
    await assert.rejects(store.saveTrade(trade()), /corrupt|read/i);
  } finally {
    await cleanTestDirectory(dir);
  }
});
test("local attachments enforce record identity, image type, idempotence and deletion", async () => {
  const dir = await mkdtemp(join(tmpdir(), "forma-test-"));
  try {
    const store = new LocalStore(dir),
      t = trade(),
      id = crypto.randomUUID();
    await store.saveTrade(t);
    const png = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
    await store.saveScreenshot({
      kind: "trade",
      recordId: t.id,
      id,
      caption: "Chart",
      mime: "image/png",
      bytes: png,
    });
    await store.saveScreenshot({
      kind: "trade",
      recordId: t.id,
      id,
      caption: "Updated caption",
      mime: "image/png",
      bytes: png,
    });
    assert.equal((await store.read()).trades[0].trade_screenshots!.length, 1);
    assert.deepEqual((await store.getScreenshot(id)).bytes, png);
    await assert.rejects(
      store.saveScreenshot({
        kind: "trade",
        recordId: crypto.randomUUID(),
        id: crypto.randomUUID(),
        caption: "",
        mime: "image/png",
        bytes: png,
      }),
      /not found/i,
    );
    await assert.rejects(
      store.saveScreenshot({
        kind: "trade",
        recordId: t.id,
        id: crypto.randomUUID(),
        caption: "",
        mime: "image/png",
        bytes: Buffer.from("<script>bad</script>"),
      }),
      /image/i,
    );
    await store.deleteTrade(t.id);
    assert.equal((await store.read()).trades.length, 0);
    await assert.rejects(store.getScreenshot(id), /not found/i);
  } finally {
    await cleanTestDirectory(dir);
  }
});
test("bulk deletion preserves preferences and custom specifications", async () => {
  const dir = await mkdtemp(join(tmpdir(), "forma-test-"));
  try {
    const store = new LocalStore(dir);
    await store.saveTrade(trade());
    await store.addInstrument({
      symbol: "TEST",
      name: "Test contract",
      tick_size: 0.5,
      point_value: 10,
    });
    await assert.rejects(store.deleteAll("wrong"), /confirm/i);
    await store.deleteAll("DELETE MY JOURNAL");
    const data = await store.read();
    assert.equal(data.trades.length, 0);
    assert.ok(data.specs.some((s) => s.symbol === "TEST"));
    const backup = JSON.parse(
      await readFile(join(dir, "journal.json.bak"), "utf8"),
    );
    assert.equal(
      backup.trades.length,
      0,
      "Deleted trades must not remain in the app-managed backup.",
    );
    assert.equal(backup.journals.length, 0);
  } finally {
    await cleanTestDirectory(dir);
  }
});

test("concurrent recovery of a crashed writer preserves every new trade", async () => {
  const dir = await mkdtemp(join(tmpdir(), "forma-test-"));
  try {
    await writeFile(
      join(dir, ".write.lock"),
      JSON.stringify({ pid: 2147483647 }),
    );
    const results = await Promise.allSettled(
      Array.from({ length: 30 }, () => new LocalStore(dir).saveTrade(trade())),
    );
    assert.deepEqual(
      results.filter((result) => result.status === "rejected"),
      [],
    );
    assert.equal((await new LocalStore(dir).read()).trades.length, 30);
  } finally {
    await cleanTestDirectory(dir);
  }
});

async function cleanTestDirectory(directory: string) {
  assert.ok(
    directory.startsWith(join(tmpdir(), "forma-test-")),
    "Cleanup must stay inside the generated test directory.",
  );
  await rm(directory, { recursive: true, force: true });
}
