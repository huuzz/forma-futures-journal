import { spawn } from "node:child_process";
import { resolve } from "node:path";
const root = process.cwd();
const child = spawn(
  process.execPath,
  [
    resolve(root, "node_modules/electron-builder/cli.js"),
    "--projectDir",
    resolve(root, "desktop-stage/app"),
    "--config",
    resolve(root, "desktop/builder.cjs"),
    "--win",
    "portable",
    "--x64",
    "--publish",
    "never",
  ],
  { stdio: "inherit", env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } },
);
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
