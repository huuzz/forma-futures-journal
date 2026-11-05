import { app, BrowserWindow, Menu, dialog, shell } from "electron";
import { spawn } from "node:child_process";
import { mkdir, readFile, appendFile } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import {
  prepareDataDirectory,
  findAvailablePort,
  isJournalNavigation,
} from "./support.mjs";

const here = dirname(fileURLToPath(import.meta.url));
app.setName("Forma Journal");
if (process.env.FORMA_DESKTOP_USER_DATA)
  app.setPath("userData", resolve(process.env.FORMA_DESKTOP_USER_DATA));
else app.setPath("userData", join(app.getPath("appData"), "Forma Journal"));
app.setAppUserModelId("local.forma.journal");
let window,
  server,
  quitting = false;
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => {
    if (window) {
      if (window.isMinimized()) window.restore();
      window.show();
      window.focus();
    }
  });
  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", () => {
    quitting = true;
    server?.kill();
  });
  app
    .whenReady()
    .then(start)
    .catch((error) => {
      dialog.showErrorBox(
        "Forma Journal could not open",
        error.message + "\n\nYour saved records have not been reset.",
      );
      app.quit();
    });
}
async function start() {
  const userDirectory = app.getPath("userData");
  await mkdir(userDirectory, { recursive: true });
  const dataDirectory = join(userDirectory, "data");
  let legacyDirectory = process.env.FORMA_LEGACY_DATA_DIR || resolve("data");
  if (app.isPackaged) {
    const settings = JSON.parse(
      await readFile(join(here, "legacy-data.json"), "utf8"),
    );
    legacyDirectory = process.env.FORMA_LEGACY_DATA_DIR || settings.directory;
  }
  await prepareDataDirectory(legacyDirectory, dataDirectory);
  const port = await findAvailablePort(),
    origin = `http://127.0.0.1:${port}`;
  const serverDirectory = app.isPackaged
    ? join(process.resourcesPath, "server")
    : resolve("desktop-stage/server");
  const logPath = join(userDirectory, "desktop.log");
  const log = (text) => {
    void appendFile(logPath, String(text)).catch(() => {});
  };
  server = spawn(process.execPath, [join(serverDirectory, "server.js")], {
    cwd: serverDirectory,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
      FORMA_DATA_DIR: dataDirectory,
      NEXT_TELEMETRY_DISABLED: "1",
    },
  });
  server.stdout.on("data", log);
  server.stderr.on("data", log);
  server.on("error", (error) => log(error.message));
  let ready = false;
  for (let attempt = 0; attempt < 150; attempt++) {
    if (server.exitCode !== null)
      throw new Error(`The local server stopped. See ${logPath}`);
    try {
      const response = await fetch(origin + "/api/health", {
        signal: AbortSignal.timeout(700),
      });
      const health = await response.json();
      if (
        response.ok &&
        health.app === "forma-local" &&
        resolve(health.storagePath) === resolve(dataDirectory)
      ) {
        ready = true;
        break;
      }
    } catch {
      /* Server is still opening. */
    }
    await delay(200);
  }
  if (!ready)
    throw new Error(`Your journal took too long to open. See ${logPath}`);
  window = new BrowserWindow({
    title: "Forma Journal",
    width: 1280,
    height: 860,
    minWidth: 760,
    minHeight: 600,
    backgroundColor: "#101216",
    show: false,
    icon: join(here, "assets", "icon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
    },
  });
  window.webContents.session.setPermissionRequestHandler(
    (_contents, _permission, callback) => callback(false),
  );
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  for (const event of ["will-navigate", "will-redirect"])
    window.webContents.on(event, (navigation, url) => {
      if (!isJournalNavigation(url, origin)) navigation.preventDefault();
    });
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: "Journal",
        submenu: [
          {
            label: "Dashboard",
            click: () => window.loadURL(origin + "/dashboard"),
          },
          {
            label: "Add trade",
            accelerator: "CmdOrCtrl+N",
            click: () => window.loadURL(origin + "/trades/new"),
          },
          { type: "separator" },
          {
            label: "Open data folder",
            click: () => shell.openPath(dataDirectory),
          },
          {
            label: "How to use Forma",
            accelerator: "F1",
            click: () => window.loadURL(origin + "/help"),
          },
          { type: "separator" },
          { role: "quit", label: "Close Forma Journal" },
        ],
      },
      {
        label: "Edit",
        submenu: [
          { role: "undo" },
          { role: "redo" },
          { type: "separator" },
          { role: "cut" },
          { role: "copy" },
          { role: "paste" },
          { role: "selectAll" },
        ],
      },
      {
        label: "View",
        submenu: [
          { role: "reload" },
          { role: "resetZoom" },
          { role: "zoomIn" },
          { role: "zoomOut" },
          { role: "togglefullscreen" },
        ],
      },
    ]),
  );
  window.once("ready-to-show", () => window.show());
  await window.loadURL(origin + "/dashboard");
  server.on("exit", () => {
    if (!quitting) {
      dialog.showErrorBox(
        "Journal server stopped",
        "Close and reopen Forma Journal. Your saved files remain in " +
          dataDirectory,
      );
      app.quit();
    }
  });
}
