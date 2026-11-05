const path = require("node:path");
const root = path.resolve(__dirname, "..");
module.exports = {
  appId: "local.forma.journal",
  productName: "Forma Journal",
  directories: {
    app: path.join(root, "desktop-stage/app"),
    output: path.join(root, "../Forma Journal"),
  },
  files: [
    "main.mjs",
    "support.mjs",
    "legacy-data.json",
    "assets/**/*",
    "package.json",
    "!**/node_modules/**/*",
  ],
  electronVersion: require("../package.json").devDependencies.electron.replace(
    /^[~^]/,
    "",
  ),
  extraResources: [
    {
      from: path.join(root, "desktop-stage/server"),
      to: "server",
      filter: ["**/*"],
    },
  ],
  asar: true,
  compression:'normal',
  afterPack:async context=>{
    const {cp,access}=require('node:fs/promises');
    const serverTarget=path.join(context.appOutDir,'resources','server');
    await cp(path.join(root,'desktop-stage/server/node_modules'),path.join(serverTarget,'node_modules'),{recursive:true,dereference:true});
    await access(path.join(serverTarget,'node_modules/next/package.json'));
    await access(path.join(serverTarget,'.next/static'));
  },
  npmRebuild: false,
  win: {
    target: [{ target: "portable", arch: ["x64"] }],
    icon: path.join(root, "desktop/assets/icon.ico"),
    signAndEditExecutable: false,
    artifactName: "Forma Journal.exe",
  },
  // In this electron-builder version, true omits UNPACK_DIR_NAME, so NSIS uses
  // its unique per-launch $PLUGINSDIR. The default shares a build-wide folder;
  // a second launch then deletes files still needed by the first instance.
  portable: { artifactName: "Forma Journal.exe", useZip: true, unpackDirName: true },
};
