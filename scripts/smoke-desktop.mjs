// Exercise the actual portable launcher, including a second launch while open.
// Uses a disposable profile; never touches the personal journal.
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { mkdtemp, readFile, mkdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { setTimeout as delay } from "node:timers/promises";

const executable = resolve(process.argv[2] || "../Forma Journal/Forma Journal.exe");
const profile = await mkdtemp(join(tmpdir(), "forma-launch-test-"));
const legacy = join(profile, "empty-legacy");
await mkdir(legacy);
const env = { ...process.env, FORMA_DESKTOP_USER_DATA: profile, FORMA_LEGACY_DATA_DIR: legacy };
delete env.ELECTRON_RUN_AS_NODE;
const launch = () => spawn(executable, [], { env, stdio: "ignore", windowsHide: true });
const first = launch();
try {
  let origin;
  for (let attempt = 0; attempt < 180; attempt++) {
    const log = await readFile(join(profile, "desktop.log"), "utf8").catch(() => "");
    origin = log.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
    if (origin) {
      try { if ((await fetch(origin + "/api/health")).ok) break; } catch { /* starting */ }
    }
    await delay(500);
  }
  assert.ok(origin, "Desktop server must start");
  const checkPages = async (label, routes) => {
    for (const route of routes) {
      const response = await fetch(`${origin}/${route}`);
      const html = await response.text();
      assert.equal(response.status, 200, `${label}: /${route} must render`);
      assert.ok(!html.includes('id="__next_error__"'), `${label}: /${route} streamed an error`);
      console.log(`${label}: /${route} OK`);
    }
  };
  // Leave the other routes cold: warming them hides deleted runtime files.
  await checkPages("First launch", ["dashboard"]);
  const second = launch();
  await new Promise((resolveExit, reject) => {
    const timer = setTimeout(() => reject(new Error("Second launcher did not exit")), 90000);
    timer.unref();
    second.once("error", (error) => { clearTimeout(timer); reject(error); });
    second.once("exit", () => { clearTimeout(timer); resolveExit(); });
  });
  await checkPages("After second launch", ["dashboard", "trades/new", "trades", "calendar", "analytics", "journal", "settings", "help"]);
  console.log("Portable launch regression passed.");
} finally {
  // Only terminate the disposable launcher created by this test and its children.
  try { execFileSync("taskkill", ["/PID", String(first.pid), "/T", "/F"], { stdio: "ignore" }); } catch { /* already exited */ }
  await delay(500);
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 })
    .catch(() => console.warn("Test profile retained because Windows still has a file open:", profile));
}
