import { test } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import {
  prepareDataDirectory,
  isJournalNavigation,
  findAvailablePort,
} from "../desktop/support.mjs";
test("desktop migration copies records and images without deleting originals", async () => {
  const dir = await mkdtemp(join(tmpdir(), "forma-desktop-test-"));
  try {
    const old = join(dir, "old"),
      target = join(dir, "desktop");
    await mkdir(join(old, "screenshots"), { recursive: true });
    await writeFile(
      join(old, "journal.json"),
      JSON.stringify({ version: 1, trades: [], journals: [] }),
    );
    await writeFile(join(old, "screenshots", "test.png"), "image");
    assert.equal(await prepareDataDirectory(old, target), "migrated");
    assert.equal(
      await readFile(join(target, "screenshots", "test.png"), "utf8"),
      "image",
    );
    assert.equal(
      await readFile(join(old, "screenshots", "test.png"), "utf8"),
      "image",
    );
    await assert.rejects(readFile(join(target, ".write.lock")));
  } finally {
    assert.ok(dir.startsWith(join(tmpdir(), "forma-desktop-test-")));
    await rm(dir, { recursive: true, force: true });
  }
});
test("existing desktop data is never overwritten by legacy data", async () => {
  const dir = await mkdtemp(join(tmpdir(), "forma-desktop-test-"));
  try {
    const target = join(dir, "desktop");
    await mkdir(target);
    await writeFile(join(target, "journal.json"), "keep existing");
    assert.equal(
      await prepareDataDirectory(join(dir, "missing"), target),
      "existing",
    );
    assert.equal(
      await readFile(join(target, "journal.json"), "utf8"),
      "keep existing",
    );
  } finally {
    assert.ok(dir.startsWith(join(tmpdir(), "forma-desktop-test-")));
    await rm(dir, { recursive: true, force: true });
  }
});
test("migration refuses overlapping folders and incomplete desktop storage", async () => {
  const dir = await mkdtemp(join(tmpdir(), "forma-desktop-test-"));
  try {
    await assert.rejects(
      prepareDataDirectory(dir, join(dir, "nested")),
      /overlap/i,
    );
    const target = join(dir, "desktop");
    await mkdir(target);
    await writeFile(join(target, "important.txt"), "preserve");
    await assert.rejects(
      prepareDataDirectory(join(dir, "old"), target),
      /contains files/i,
    );
  } finally {
    assert.ok(dir.startsWith(join(tmpdir(), "forma-desktop-test-")));
    await rm(dir, { recursive: true, force: true });
  }
});
test("desktop window only navigates to its exact local journal origin", () => {
  assert.equal(
    isJournalNavigation(
      "http://127.0.0.1:43123/trades/new",
      "http://127.0.0.1:43123",
    ),
    true,
  );
  for (const url of [
    "https://example.com",
    "file:///C:/private.txt",
    "http://127.0.0.1:3000",
    "http://127.0.0.1.evil.example:43123",
  ])
    assert.equal(isJournalNavigation(url, "http://127.0.0.1:43123"), false);
});
test("desktop can select an unused loopback port", async () => {
  const port = await findAvailablePort();
  assert.ok(port > 0 && port < 65536);
});
test("migration waits for an active source save before copying its snapshot", async () => {
  const dir = await mkdtemp(join(tmpdir(), "forma-desktop-test-"));
  try {
    const source = join(dir, "source"),
      target = join(dir, "target");
    await mkdir(source);
    await writeFile(
      join(source, "journal.json"),
      JSON.stringify({ version: 1, trades: [], journals: [] }),
    );
    await writeFile(
      join(source, ".write.lock"),
      JSON.stringify({ pid: process.pid }),
    );
    const migration = prepareDataDirectory(source, target);
    await delay(100);
    await writeFile(
      join(source, "journal.json"),
      JSON.stringify({
        version: 1,
        trades: [{ id: "finished-save" }],
        journals: [],
      }),
    );
    const { unlink } = await import("node:fs/promises");
    await unlink(join(source, ".write.lock"));
    await migration;
    assert.equal(
      JSON.parse(await readFile(join(target, "journal.json"), "utf8")).trades[0]
        ?.id,
      "finished-save",
    );
  } finally {
    assert.ok(dir.startsWith(join(tmpdir(), "forma-desktop-test-")));
    await rm(dir, { recursive: true, force: true });
  }
});
