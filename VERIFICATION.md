# Verification notes

## Windows desktop application

The Windows x64 portable build was packaged and launched successfully. Its embedded Next.js server started on a dynamically selected loopback port. Native window accessibility inspection confirmed the dashboard rendered the disposable QA journal and F1 opened the Getting started page. The QA window was closed before opening the personal application. A desktop shortcut was created. The personal server reported ready; the subsequent personal-window screen check was stopped by the user with Escape.

The desktop suite adds six tests for origin boundaries, unused ports, migration, existing-data preservation, invalid sources, and waiting for an active writer before taking the migration snapshot. The complete suite has 40 tests. The build is unsigned. Packaged server dependencies are explicitly included and checked after packing.

## Fully local conversion

The user selected a personal, account-free journal that stores everything on this computer. The active application no longer uses Supabase, PostgreSQL, cloud image storage, sign-in, or deployment credentials. Historical design documents describe the earlier cloud version and are superseded by docs/local-conversion-plan.md.

## Automated verification

Domain tests remain for all eight futures contracts, long/short calculations, decimal fees and adjustments, missing risk, open/draft exclusion, drawdown and streaks, timezone/DST boundaries, and CSV safety.

Local-store tests exercise real temporary disk files, not database mocks: persistence across instances, concurrent writes, trade validation, immutable contract snapshots, submission identity, daily reflection uniqueness, preferences, corruption refusal, previous-snapshot preservation, screenshot bytes/type/record identity/idempotence, and deletion. Request tests reject non-loopback Host headers and cross-origin mutations.

## Runtime boundaries

The data folder contains journal.json, its previous metadata snapshot, and original image files. The app does not encrypt these files; the computer's operating-system account/disk protection applies. Complete backups require the whole folder. JSON/CSV exports contain metadata but not image bytes.

Normal npm commands and the Windows launcher bind to 127.0.0.1 with framework telemetry disabled. There is no public deployment or external synchronization. The original preview/setup/login URLs redirect to the real journal.

The production build passed TypeScript and ESLint checks. All 34 automated tests pass. A separate read-only review identified stale-lock recovery races, deleted records remaining in the managed snapshot, and image flushing before metadata commit. All were corrected; regression tests reproduced the first two failures before their fixes. A 30-writer recovery test now preserves all records.

Browser integration used a disposable local data folder: created a closed NQ trade with a PNG attachment, confirmed $794 net/$400 planned risk/30-minute duration, opened the locally served full-size screenshot, changed its caption, edited the exit to produce $1,194 net, and reloaded to verify both edits persisted. Created and reloaded a daily reflection; the dashboard showed the saved trade's real total. Saved a display name and light theme, then reloaded to verify both persisted. The inspected browser console had no errors.

HTTP checks verified JSON/CSV exports, exact original PNG bytes from the image endpoint, missing-image responses, Host rejection, and cross-origin/missing-origin mutation rejection. The user's real data folder was not used for these tests and contains no synthetic trades. No Supabase or other external service was involved.

The Windows launcher was run successfully with its browser-opening step suppressed during testing. It started the background server on port 3000 using the real default data directory; exports confirmed zero trades and zero reflections. Reopening the launcher correctly reused that server. Both PowerShell scripts passed syntax parsing. The actual journal was opened in the app browser, and the temporary test server was stopped.
