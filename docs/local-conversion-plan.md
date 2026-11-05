# Fully local journal conversion

The user explicitly selected the offered fully local, account-free version. This supersedes the original Supabase/authentication/deployment requirements; all trading behavior remains in scope.

## Design
Retain Next.js and the existing interface/calculation layer. Use a versioned local JSON database with atomic replacement, last-good metadata snapshot, and serialized/locked mutations. Store original image bytes separately in data/screenshots. Default data location is the application directory's data folder, with an optional FORMA_DATA_DIR override. Never send journal data to a remote service.

Run on 127.0.0.1. Reject non-loopback Host headers and cross-origin mutations. There is one personal workspace and no login. Remove active Supabase dependencies/routes and cloud configuration UI. Old login/setup/preview URLs redirect to the real dashboard.

## Execution plan
1. Write failing tests for disk persistence across instances, concurrent writes, corruption handling, validation, screenshots, deletion, and local request guards.
2. Implement the local store and shared input schemas. Preserve financial calculation tests and existing valid records. A missing database starts empty; an unreadable or corrupt database must never silently reset.
3. Replace server reads/mutations and screenshot APIs with the local store. Keep mutation validation and immutable contract snapshots.
4. Remove sign-in and cloud UI; show local storage status. Add folder-backup instructions and a loopback-only Windows launcher.
5. Verify unit/integration tests, types, lint, build, and real browser create/edit/reload/attachments/journal/preferences/export behavior against a disposable data directory. Do not insert test trades into the real personal journal.
6. Review, commit, and rebuild the source archive. Leave the real empty journal running for the user.

## Constraints
Data is protected by the computer's user account and disk permissions, not encrypted by the app. Browser clearing does not delete server files. App removal must not accidentally delete data; upgrades keep the data folder. No broker integrations or trade CSV importing are added. Complete folder copies include both metadata and screenshots; JSON/CSV exports remain record exports.
