import { cp, mkdir, writeFile, readFile, access } from "node:fs/promises";
import { resolve, join } from "node:path";
const root = process.cwd(),
  stage = resolve("desktop-stage");
await mkdir(join(stage, "server"), { recursive: true });
await mkdir(join(stage, "app", "assets"), { recursive: true });
for (const entry of ["server.js", "package.json", "node_modules", ".next"])
  await cp(
    join(root, ".next", "standalone", entry),
    join(stage, "server", entry),
    { recursive: true, dereference: true },
  );
await cp(
  join(root, ".next", "static"),
  join(stage, "server", ".next", "static"),
  { recursive: true },
);
try {
  await access(join(root, "public"));
  await cp(join(root, "public"), join(stage, "server", "public"), {
    recursive: true,
  });
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
for (const entry of ["main.mjs", "support.mjs"])
  await cp(join(root, "desktop", entry), join(stage, "app", entry));
await cp(join(root, "desktop", "assets"), join(stage, "app", "assets"), {
  recursive: true,
});
await writeFile(
  join(stage, "app", "legacy-data.json"),
  JSON.stringify({ directory: resolve("data") }),
);
await writeFile(
  join(stage, "app", "package.json"),
  JSON.stringify({
    name: "forma-journal-desktop",
    productName: "Forma Journal",
    version: "1.0.0",
    description: "Your personal, fully local futures trading journal.",
    author: "Personal journal",
    type: "module",
    main: "main.mjs",
    dependencies: {},
  }),
);
await writeFile(
  join(stage, "app", "package-lock.json"),
  JSON.stringify({
    name: "forma-journal-desktop",
    version: "1.0.0",
    lockfileVersion: 3,
    requires: true,
    packages: { "": { name: "forma-journal-desktop", version: "1.0.0" } },
  }),
);
const tracedPackage = JSON.parse(
  await readFile(join(stage, "server", "package.json"), "utf8"),
);
if (!tracedPackage.dependencies?.next)
  throw new Error("Standalone Next.js server was not staged.");
try {
  await access(join(stage, "server", "data"));
  throw new Error("Personal data must never be bundled.");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
console.log("Desktop server and host staged without personal journal data.");
