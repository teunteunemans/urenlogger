---
phase: 02-command-migration
plan: 02
subsystem: api
tags: [discord-api-types, firebase-admin, nodemailer, deferred-reply, next-server-after]

# Dependency graph
requires:
  - phase: 02-command-migration/01
    provides: Shared modules, Firebase service, command dispatch router with deferred reply pattern
provides:
  - All 6 slash commands fully implemented (registreer, log, wijzig, verwijder, uren, email)
  - Email report utility (sendMonthlyReport, sendTestEmail) ready for cron integration
  - Dutch email subcommands (instellen, verwijderen, tonen)
affects: [cron-deployment]

# Tech tracking
tech-stack:
  added: []
  patterns: [next/server after() for serverless background work, Discord REST API command registration]

key-files:
  created:
    - next/lib/utils/email.ts
  modified:
    - next/lib/discord/commands.ts
    - next/lib/i18n/nl.ts

key-decisions:
  - "Replaced fire-and-forget void IIFE with next/server after() — Vercel kills serverless functions after response, after() keeps them alive"
  - "Renamed email subcommands from English (set/remove/show) to Dutch (instellen/verwijderen/tonen) for consistency"

patterns-established:
  - "Use after() from next/server for background work after deferred response on Vercel"

issues-created: []

# Metrics
duration: 49min
completed: 2026-02-03
---

# Phase 2 Plan 2: Port All 6 Commands & Email Utility Summary

**All 6 slash commands ported to HTTP interactions endpoint with deferred reply via after(), plus nodemailer email report utility for cron integration**

## Performance

- **Duration:** 49 min
- **Started:** 2026-02-03T13:23:38Z
- **Completed:** 2026-02-03T14:13:10Z
- **Tasks:** 2 (+ 1 checkpoint)
- **Files modified:** 3

## Accomplishments
- All 6 command handlers fully implemented with Firebase CRUD, Dutch date parsing, and i18n messages
- Email report utility ported with nodemailer SMTP, HTML/text report generation, and monthly send functions
- Fixed critical serverless bug: replaced fire-and-forget with next/server after() to keep Vercel functions alive
- Email subcommands renamed to Dutch (instellen/verwijderen/tonen)
- Discord slash commands registered via REST API

## Task Commits

Each task was committed atomically:

1. **Task 1: Port all 6 slash commands** - `3a0bc39` (feat)
2. **Task 2: Port email report utility** - `c02e0fc` (feat)
3. **Fix: Dutch email subcommand names** - `118b042` (fix)
4. **Fix: after() for serverless deferred replies** - `ad8d294` (fix)

## Files Created/Modified
- `next/lib/discord/commands.ts` - All 6 command handlers with option extraction helpers, split message logic, after() dispatch
- `next/lib/utils/email.ts` - SMTP transporter, HTML/text report generation, sendMonthlyReport, sendTestEmail
- `next/lib/i18n/nl.ts` - Updated email subcommand references to Dutch names

## Decisions Made
- Replaced fire-and-forget void IIFE with `after()` from `next/server` — Vercel serverless kills functions after response is returned, after() keeps execution alive for the PATCH
- Renamed email subcommands to Dutch for consistency with rest of bot interface

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fire-and-forget pattern fails on Vercel serverless**
- **Found during:** Checkpoint verification (Task 3)
- **Issue:** `void (async () => { ... })()` pattern doesn't work on Vercel — function terminates after returning the deferred response, before the PATCH completes. Users saw "thinking..." forever.
- **Fix:** Replaced with `after()` from `next/server` which keeps the function alive
- **Files modified:** next/lib/discord/commands.ts
- **Verification:** Build passes, deployed to Vercel
- **Committed in:** `ad8d294`

---

**Total deviations:** 1 auto-fixed (bug), 0 deferred
**Impact on plan:** Critical fix — without it, no commands would work on Vercel.

## Issues Encountered
None

## Next Phase Readiness
- All commands functional via Discord interactions endpoint
- Email utility ready for Phase 3 cron integration
- Command registration done via REST API (Phase 3 will add a script for this)

---
*Phase: 02-command-migration*
*Completed: 2026-02-03*
