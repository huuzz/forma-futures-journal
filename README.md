# Forma — Futures Trading Journal

A private, manual futures trading journal built with Next.js App Router, TypeScript, Tailwind, shadcn-style components, Supabase Auth/PostgreSQL/Storage, Recharts and Lucide. Deployable to Vercel. No broker connections, account balances, fabricated trades, or imports.

## Requirements

- Node.js 24 LTS and npm.
- A Supabase project (the free tier can be used within its limits). Authentication, database access, and private uploads require your project's public URL/key. No paid API is needed by this source code.
- Vercel access only when you choose to deploy.

## Run locally

```powershell
npm ci
Copy-Item .env.example .env.local
# Fill in your project's public URL and publishable key.
npm run dev
```

Open http://localhost:3000. Without environment configuration, the app shows `/setup`; it does not silently save to browser storage.

Visit `/preview` for an empty-data dashboard preview before connecting Supabase. It never reads or saves account data. The normal workspace remains protected by authentication.

## Configure Supabase

1. Create a new Supabase project.
2. Open SQL Editor and run `supabase/migrations/001_foundation.sql` once. It creates the tables, RLS, authentication provisioning trigger, standard instruments and private screenshots bucket. Use a fresh project to avoid name collisions. With Supabase CLI, migrations can instead be applied using `supabase db push` after linking your project.
3. Copy the Project URL and publishable key from the project's API settings into `.env.local`. A legacy anon key is also supported. **Never use a secret or service-role key in a NEXT_PUBLIC variable.**
4. Under Authentication → URL Configuration, set Site URL to `http://localhost:3000`; add `http://localhost:3000/auth/callback` as a redirect URL. Production uses the equivalent HTTPS URL. Set `NEXT_PUBLIC_SITE_URL` to the same base URL.
5. Keep email confirmation enabled. Configure an SMTP provider for production email delivery according to your needs; the built-in provider has delivery/rate restrictions.
6. Restart the dev server. Create an account, confirm the email, then sign in. Confirm and reset links must be opened in the browser that initiated the flow, because authentication uses PKCE cookies.

Tables are created before users sign up so the provisioning trigger can create profiles/settings. For a project with existing users, backfill those rows before using it.

## Validation

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

Node's built-in test runner executes TypeScript domain tests without a separate test framework. Live Supabase integration tests require a configured project; local unit/build checks do not prove deployed authentication or RLS behavior.

The test suite also runs the actual SQL migration in PGlite (local PostgreSQL) against minimal Supabase-compatible auth/storage schemas. It checks provisioning, per-user RLS, cross-owner foreign keys, tick/stop validation, daily uniqueness, storage-object isolation, and owner-scoped bulk deletion. This validates PostgreSQL policies locally; Supabase email delivery, cookie refresh, storage-service MIME enforcement, and signed URLs still require live integration testing.

## Application behavior

- `/trades/new`: manual entries, live decimal calculations, incomplete drafts, notes, psychology, custom emotion/mistake labels, and private screenshots through browse/drop/paste.
- `/trades`: searchable, sortable, filterable history; each row opens an editable full trade.
- `/dashboard`: realized metrics, cumulative/daily/weekly/monthly charts, recent closed trades, discipline, and streaks with date filters.
- `/calendar`: monthly results with daily details, weekly totals, screenshots, and daily reflections.
- `/analytics`: profitability, entry-time windows, instrument comparisons, planned risk, contract quantities, loss sequences, mistakes, and emotions.
- `/journal`: one reflection per date, editing/search/deletion, and private daily screenshots.
- `/settings`: profile, timezone, theme, currency formatting, screenshot size, custom instruments, CSV/JSON export, and confirmed journal deletion.

Closed trades realize on their exit date in the configured timezone. History's date filters use the explicitly entered trade date. Breakeven trades count in win-rate denominators and reset the current streak. Profit factor uses positive and negative net trade results; it displays infinity if there are wins but no losses, and unavailable if neither exists. Missing initial risk excludes a trade from R/risk averages. Drawdown measures cumulative realized P&L, not account equity.

Entry-time analytics use the configured timezone. Session groups are explicitly labeled local clock windows: 00:00–06:59, 07:00–09:29, 09:30–15:59, and 16:00–23:59, not exchange session calendars. Repeated DST execution times choose the earlier occurrence; nonexistent local times are rejected. Standard contract prices must be positive in this version.

Screenshots are uploaded after the parent record is saved. Partial failures retain only unfinished images for retry. Stable per-image paths and idempotent metadata registration prevent duplicate attachments after lost responses. Saved screenshots can be recaptioned, replaced, viewed full-size, or deleted. Export includes screenshot metadata, not binary image files; private signed viewing links expire after 15 minutes.

Deleting records removes their storage images before removing relational records. Storage and PostgreSQL cannot share a transaction; errors report partial removal so it can be retried. Bulk relational deletion itself is transactional. Use the Settings bulk-deletion action to include orphan images from interrupted uploads.

## Security model

- Every server mutation verifies the current user through Supabase Auth; all user tables enforce row-level ownership.
- Composite foreign keys prevent associating attachments/tags with a different owner's records.
- Shared instrument defaults are read-only. Custom contracts are owner-specific.
- Screenshots live in a private bucket. Object paths begin with the user ID. Signed URLs are temporary.
- No administrative database credentials are used. Authorization is not delegated solely to navigation or proxy redirects.
- Authenticated pages are dynamically rendered and responses carry private/no-store caching headers.

Before production, create two test users and verify that neither can read/update/delete the other's trades, journal entries, attachment metadata, or storage objects. Verify password recovery and email confirmation on your configured production domain. Check that anonymous table/storage requests are denied. Apply the migration to a disposable project first.

## Deploy to Vercel

1. Push this directory to your own Git repository and import it into Vercel.
2. Choose the Next.js preset and Node.js 24 runtime. Use `npm run build`.
3. Add the public Supabase URL/key and production `NEXT_PUBLIC_SITE_URL` to Vercel environment settings.
4. Add the production callback URL in Supabase Auth settings before signing in.
5. Deploy, then verify authentication and private uploads with your own project. No deployment is performed automatically by this local source project.

## Source references

- [Supabase SSR authentication](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Next.js App Router](https://nextjs.org/docs/app)
- [CME Micro E-mini specifications](https://www.cmegroup.com/articles/faqs/micro-e-mini-equity-index-futures-frequently-asked-questions.html)
- [CME Gold specifications](https://www.cmegroup.com/trading/metals/files/fact-card-gold-futures-options.pdf)
- [CME Micro WTI specifications](https://www.cmegroup.com/education/articles-and-reports/micro-wti-crude-oil-futures-faq)
