# Futures Trading Journal — Application Design

## Intent
Build a personal manual futures journal that makes entering trades straightforward and turns saved records into useful performance and discipline analysis. The supplied specification is the product scope. No brokerage, account balances, strategy management, imports, live data, or AI features will be added.

## Existing project
The workspace contains only empty work and outputs directories. There is no application or repository to preserve.

## Architecture decision
Use the requested Next.js App Router, TypeScript, Tailwind, shadcn/ui, Recharts, Lucide, and Supabase stack. Prepare deployment for Vercel. A Sites-native implementation would change the requested framework/runtime arrangement; a browser-only journal would not meet authentication, storage, or security requirements. Neither alternative is selected. This decision follows the user's explicit technology requirements.

Create the application under outputs/futures-journal so the complete source is a deliverable. Use server components for protected page loading and client components for forms, charts, filters, and uploads. Organize domain calculations and aggregation separately from UI and database code. Use server actions or route handlers for mutations, validating inputs and checking authenticated identity on the server. No service-role key will be exposed to the browser.

## Data model
- Supabase auth.users owns identity; profiles stores the user's display name.
- application_settings stores timezone, currency display, theme, and screenshot preferences per user.
- futures_contract_specs stores symbol, tick size, point value, label, and optional owner. Seed standard instruments; custom specifications belong to their creator.
- trades stores owner, trade date, timezone-aware execution timestamps, instrument specification snapshot, expiration, direction, status, quantity, prices, commissions, fees, adjustment and its reason, notes, confidence, plan adherence, and emotion labels.
- trade_screenshots stores owner, trade reference, private object path, caption, and ordering.
- journal_entries stores owner, trading date, market outlook, premarket thoughts, plan, goals, emotions, mistakes, lessons, reflection, and notes. One daily entry per user and date.
- journal_screenshots associates private uploads with daily entries.
- mistake_tags and emotion_tags support seeded suggestions and user-created labels; trade_mistake_tags associates trades with mistakes.

Use UUID primary keys, ownership foreign keys, timestamps, appropriate indexes, check constraints, and cascade rules. Prices and contract specifications use PostgreSQL numeric types. Preserve each trade's contract specification snapshot so later custom-contract edits cannot rewrite past results.

## Security and storage
Enable RLS on every user-owned table; policies constrain reads and writes to auth.uid(). Shared contract defaults are readable, but cannot be edited by ordinary users. Authorization is repeated in server mutations. Screenshot storage is private, with owner-prefixed object paths and storage policies checking ownership. Validate image type and size; access full images through expiring signed URLs. Do not save public screenshot URLs. Keep secrets in ignored environment files and provide a placeholder-only example file.

Authentication supports email/password sign-in, registration, sign-out, and password reset. Protected routes redirect unauthenticated users. Clear configuration screens explain missing Supabase settings instead of pretending data was saved.

## Calculations
A pure tested domain module calculates direction-adjusted points, ticks, gross result, net result, planned dollar risk, planned reward/risk, realized R, duration, and outcome. Missing inputs yield unavailable results rather than invented zeroes. Only closed trades with valid execution data enter realized aggregates. Fees and commissions are total dollar amounts for the trade.

Require positive integer contracts, positive prices where supplied, supported tick increments, direction-correct stops and targets, chronological execution times, and a reason for nonzero manual adjustments. Drafts can omit execution fields. Closed trades require sufficient execution information. Use decimal arithmetic for prices and money, with rounding at display boundaries. Distinguish planned reward/risk from realized R.

Seed NQ, MNQ, ES, MES, GC, MGC, CL, and MCL after checking official exchange specifications. Analytics handle empty samples, zero risk, no losses, and breakeven trades explicitly. Calculate drawdown from the cumulative realized P&L series, without presenting account equity.

## Interface
Use a charcoal dark theme by default with restrained green/red results, readable typography, rounded panels, and a responsive sidebar. Light theme is optional. All controls have accessible labels, focus states, and keyboard support. Empty states lead to adding the first trade; no demonstration trades are inserted.

Navigation: Dashboard, Add Trade, Trade History, Trading Calendar, Analytics, Trading Journal, Settings.

Trade entry is split into execution, live calculation summary, screenshots, notes, and psychology sections. Save Draft and Save Trade clearly communicate their effects. A submission lock and server validation prevent duplicate submission. Editing reuses the same form. Screenshot attachment supports selection, drop, paste, preview, caption, replacement, removal, and full-size viewing.

History provides searchable/sortable paginated records with the specified columns and filters, a complete detail view, edit actions, and confirmed deletion.

Dashboard shows the specified performance metrics, realized P&L charts, recent trades, streaks, best/worst day, calendar preview, and discipline results. Date presets and custom ranges consistently filter the underlying closed trades.

Calendar uses the configured trading timezone for execution-based grouping, with daily and weekly results, monthly navigation, and a daily detail panel linking trades, images, and the journal entry. A trade's explicitly chosen trading date remains available as journal metadata; realized charts use exit dates in the chosen timezone.

Analytics shares the same aggregation functions as the dashboard and provides profitability, time, instrument, risk, and discipline views. Trading sessions will use documented time windows in the configured timezone, with labels explaining those windows. All charts derive from saved records.

Daily journal supports create, edit, delete, search, date browsing, and private image attachments. Settings supports profile, timezone, currency formatting, theme, specifications, screenshot preferences, CSV/JSON export, and confirmed deletion of owned journal data. Currency selection changes formatting only; no exchange-rate conversion is implied.

## Implementation sequence and verification
1. Foundation: initialize project, migrations, RLS, authentication, navigation, theme, environment documentation. Check types, lint, build, and authentication configuration handling.
2. Trade entry: write calculation tests first, then validation, forms, persistence, images, edit/delete. Verify long/short, drafts/open trades, image ownership, and error paths.
3. History: implement filters, sorting, details, pagination, and screenshot viewing. Check CRUD and filter behavior.
4. Dashboard: implement shared aggregation and charts. Test empty data and known saved-data cases.
5. Calendar: implement timezone-aware grouping, monthly navigation, weekly totals, and journal links. Test date boundaries.
6. Analytics: extend tested aggregation for time, instruments, risk, and discipline. Verify zero denominators and insufficient samples.
7. Journal: implement reflections, search, attachments, and calendar integration. Verify ownership and date uniqueness.
8. Polish: responsive and accessibility checks, error states, production build, security tests, and deployment documentation.

Use Git milestones if Git is available. Run required checks at phase boundaries and resolve failures before proceeding. Document checks requiring a live Supabase instance separately from checks verified locally.

## External configuration and boundaries
Supabase provisioning requires the user's account and project. Supply SQL migrations and exact setup steps; never invent credentials or claim live authorization/storage tests without a configured project. Vercel deployment requires the user's deployment access and environment settings. Source implementation can proceed without these credentials, but production authentication, persistence, private uploads, and deployed end-to-end verification remain dependent on configuration.

## Builder decisions
Proposed product name: Forma Journal. Default timezone: America/Toronto, editable. Default currency: USD, since the initial contracts are USD-denominated. Screenshot limit: 10 MB per image, configurable downward. No seeded trades. Prefer server-authorized mutations and one shared domain layer for every result shown throughout the application.
