import { spawn } from "node:child_process";
import { resolve } from "node:path";
const [command, ...extra] = process.argv.slice(2);
if (
  !["dev", "build", "start"].includes(command) ||
  extra.some((value) => ["--hostname", "-H"].includes(value))
)
  throw new Error(
    "Use dev, build, or start. The personal journal binds to 127.0.0.1.",
  );
const args = [resolve("node_modules/next/dist/bin/next"), command, ...extra];
if (command !== "build") args.push("--hostname", "127.0.0.1");
const child = spawn(process.execPath, args, {
  stdio: "inherit",
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
});
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
