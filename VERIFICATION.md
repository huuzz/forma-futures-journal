# Verification and handoff

## Implemented source

The repository contains the eight requested areas: authenticated foundation, manual trade entry, trade history, dashboard, trading calendar, analytics, daily reflections, and settings/export/deletion. It includes private screenshot handling, custom instruments and labels, exact-decimal domain calculations, Supabase migrations, and Vercel setup instructions. No demonstration trades are inserted.

## Automated checks

- 38 tests pass: calculations across all eight instruments; long/short, fees, documented adjustments, missing inputs, drafts/open trades, direction and tick validation; timezone/DST boundaries; realized-only analytics, drawdown/streaks and zero denominators; export escaping; pagination and failures; authentication validation; interrupted upload progress; PostgreSQL migration/security checks.
- ESLint and TypeScript checks pass.
- Next.js production build passes.
- npm dependency audit reports zero vulnerabilities after a narrowly scoped override of a vulnerable development-only glob dependency. The override is covered by the lint check.

The SQL tests execute the actual migration in PGlite, with minimal auth/storage schemas implementing Supabase's ownership context. They test actual PostgreSQL RLS and constraints, not source-code string matching.

## Code review

A separate read-only review covered authentication, server mutations, calculations, ownership, uploads, analytics, journal state, and export. The two important findings were corrected: actual passwords are now required on the server, and screenshot retries preserve progress with stable object paths/idempotent registration. Saved screenshot caption editing and replacement were also completed.

## Browser checks

Tested against the optimized local production build: setup guide, dark/light toggle, mobile drawer and Escape dismissal, empty dashboard, and live long/short trade calculations. A two-contract NQ example entered temporarily in the unsaved preview produced $800 gross, $794 net after $6 total costs, $400 risk, 3:1 planned reward/risk, 80 ticks, and 30 minutes. Switching it to Open removed realized P&L. Preview Save showed the connection requirement and stored nothing.

At a 390px mobile viewport and a 1440px desktop viewport, the dashboard document width matched its available viewport width. A history-table overflow found during testing was fixed. The inspected browser console had no errors. Authenticated persistence/upload flows remain untested against a live Supabase service.

## Remaining external setup

The application is not connected to a live Supabase project and has not been deployed. Add your project's public URL/key, apply the supplied migration to a fresh project, configure authentication callback URLs, and create your account. See README.md.

After connecting, verify email confirmation/password recovery, expired-session refresh, real trade/reflection CRUD, image browse/drop/paste, private signed URLs, exports, and deletion using two disposable users. Those external-service flows have not been proven by the local tests. SMTP delivery/rate limits and production-domain redirects depend on your project configuration.

## Product boundaries

- Prices must be positive; one entry, exit, and quantity per trade. Scaling executions are intentionally excluded.
- Currency preferences change formatting, not conversion. Standard instruments calculate USD results.
- Entry-hour windows are explicitly labeled local clock intervals, not exchange session calendars.
- Missing stops leave risk/R metrics unavailable; open/draft trades do not realize P&L.
- Screenshot and record deletion spans Storage and PostgreSQL; partial failures are reported for retry. Relational bulk deletion is transactional.
- The public `/preview` shows only an empty dashboard or an unsaved local trade form. It does not bypass authentication or read account data.

The application remains in its own local `feat/futures-journal` repository. No remote repository, merge, PR, or production deployment was requested or performed.
