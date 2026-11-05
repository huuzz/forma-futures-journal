# Personal desktop application

The user explicitly requested a simple desktop app and instructions. Preserve all existing personal journal data and local-only behavior.

Use Electron as a thin desktop window around the production standalone Next.js server. Package a portable Windows executable with electron-builder. It contains its own runtime, needs no terminal, Node installation, login, or network after installation. Keep app files under outputs/Forma Journal and create a desktop shortcut after the packaged app passes checks.

Use a single instance, sandboxed browser window, no Node access in renderer, no arbitrary new windows or external navigation. Start the embedded server on loopback, choose an unused port, verify the health endpoint before opening the journal, and stop the owned child when the app closes. Existing web journal servers must not be killed or hijacked.

On first launch, copy the existing project data folder to a stable per-user desktop data directory only when no desktop journal already exists. Never overwrite existing desktop data, never bundle personal records in the executable, and leave the original folder intact. Provide a menu command to open the data folder and an in-app Getting started page explaining Add Trade, drafts/open/closed, History, Calendar, Journal, and backups.

Execution: test navigation/port and safe migration rules first; implement desktop host and standalone packaging; verify the packaged server, build/lint/type checks and existing tests; launch actual app and verify reuse/close; create desktop shortcut; update guide and source bundle. User approval to make the desktop app authorizes the implementation; no additional design gate is needed.
