# Futures Journal Implementation Plan

> Execute inline with the executing-plans workflow, as authorized by “looks good begin”.

**Goal:** Deliver the approved personal futures trading journal in eight verified phases.
**Architecture:** Next.js App Router with authenticated server mutations, Supabase RLS and private storage. Pure domain functions supply every realized metric.
**Tech Stack:** TypeScript, Tailwind, shadcn/ui, Supabase, Recharts, Lucide, Vercel.
**Spec:** application-design.md and the user's supplied specification.

## Global constraints
No fabricated financial data, no sample trades, no account balances, no broker connections, no strategy management. Missing external credentials must be explained. Store only owner-accessible data. Draft/open trades never contribute realized results.

## Review focus
1. Missing Supabase configuration: usable setup guidance, never a false saved state.
2. Expired or missing sessions: protected server requests reject access.
3. Cross-user references: database rejects attaching another user's records.
4. Long/short and decimal boundaries: calculations obey tick increments and direction.
5. Trading dates near midnight: grouping respects the user's timezone.

## Task 1 — Foundation
Files: package/config files; src/app/layout.tsx, globals.css, (auth), (journal); src/components/shell.tsx and ui/; src/lib/supabase/{server,client,proxy}.ts; src/proxy.ts; supabase/migrations/001_foundation.sql; README.md.
Interfaces: createClient() returns a cookie-scoped Supabase client; requireUser() returns a verified User and client; getConfig() returns validated public configuration or null.
- [ ] Scaffold Next.js and install UI/auth dependencies.
- [ ] Test configuration validation and safe redirect paths before implementation.
- [ ] Create schema, ownership policies, private storage, and provisioning trigger.
- [ ] Implement email auth, reset flow, auth callbacks, proxy refresh, route authorization.
- [ ] Build responsive dark/light navigation and useful empty states.
- [ ] Verify tests, lint, types, build; verify RLS on local PostgreSQL if runtime exists, otherwise explicitly document live verification gap.
- [ ] Commit stable foundation.

## Task 2 — Trade entry
Files: src/lib/{calculations,validation}.ts, tests/calculations.test.ts, src/app/(journal)/trades/actions.ts, trades/new and trades/[id], src/components/trade-form.tsx and screenshots.tsx.
Interfaces: calculateTrade(input) returns nullable metrics; validateTrade(input) returns validated data; requireUser() authorizes every mutation.
- [ ] Write and run failing long/short, fees, adjustments, missing input, tick and placement tests.
- [ ] Implement decimal calculations and validation, pass tests.
- [ ] Add draft/closed forms, notes, tags, psychology, private image handling, edit/delete.
- [ ] Verify CRUD error handling and check suite; commit.

## Task 3 — History
Files: src/components/trade-history.tsx, src/app/(journal)/trades/page.tsx.
- [ ] Add search, date/instrument/direction/outcome/discipline/mistake filters, sorting, detail links and screenshot indicators.
- [ ] Verify filters on known inputs; run suite and checks; commit.

## Task 4 — Dashboard
Files: src/lib/analytics.ts, tests/analytics.test.ts, src/components/dashboard.tsx, charts.tsx.
- [ ] Write failing realized-only, zero-loss, drawdown, date-range, timezone tests.
- [ ] Implement aggregation; dashboard metric cards, curves, bars, recent trades, discipline and streaks.
- [ ] Verify empty datasets and known totals; run checks; commit.

## Task 5 — Calendar
Files: src/components/trading-calendar.tsx, calendar/page.tsx.
- [ ] Implement timezone-aware daily/weekly/monthly totals and navigation.
- [ ] Link selected dates to trades and daily journal.
- [ ] Verify month/year and date boundaries; run checks; commit.

## Task 6 — Analytics
Files: src/components/analytics.tsx, analytics/page.tsx; extend src/lib/analytics.ts tests.
- [ ] Add profitability, weekday/hour/session/month, instrument, risk/size, loss-sequence, discipline/emotion/mistake analysis.
- [ ] Verify empty samples, denominators, session windows and saved-data sourcing; run checks; commit.

## Task 7 — Daily journal
Files: src/components/journal.tsx, journal/page.tsx, journal/actions.ts.
- [ ] Add create/edit/delete/search dated reflections and private attachments.
- [ ] Verify date uniqueness and ownership; run checks; commit.

## Task 8 — Final polish
Files: settings/page.tsx, settings/actions.ts, export route, README.md, tests.
- [ ] Implement settings, custom specs/tags, CSV/JSON exports, confirmed data deletion.
- [ ] Review responsiveness, accessibility, errors and security; fix observed gaps.
- [ ] Run full test suite, lint, typecheck, production build; browser QA when supported.
- [ ] Obtain fresh code review and fix important findings; commit final deliverable.

## Execution rulings
The user's explicit approval to begin carries authorization to execute the plan inline; no second plan-approval gate is introduced. This new empty application is already isolated in its own deliverable directory; initialize its own feature-branch repository rather than a redundant worktree.
