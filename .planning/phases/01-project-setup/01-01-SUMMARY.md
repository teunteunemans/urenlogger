---
phase: 01-project-setup
plan: 01
subsystem: infra
tags: [nextjs, discord, ed25519, discord-verify, discord-api-types]

# Dependency graph
requires: []
provides:
  - Next.js project scaffold in next/ subdirectory
  - Discord interactions endpoint with ed25519 signature verification
  - PING/PONG handler validated by Discord
  - Placeholder ApplicationCommand response
affects: [command-migration, cron-deployment]

# Tech tracking
tech-stack:
  added: [next@15, discord-verify, discord-api-types, react@19]
  patterns: [API route handler, raw body signature verification, discord-verify/node verify()]

key-files:
  created:
    - next/app/api/interactions/route.ts
    - next/lib/discord/verify.ts
    - next/.env.example
    - next/app/page.tsx
    - next/app/layout.tsx
  modified: []

key-decisions:
  - "Used verify() from discord-verify/node instead of isValidRequest — isValidRequest expects a full Request object, but plan requires reading body with req.text() first for signature verification"

patterns-established:
  - "Raw body reading pattern: req.text() first, then JSON.parse() after signature verification"
  - "Node.js runtime for all API routes (firebase-admin requirement in Phase 2)"

issues-created: []

# Metrics
duration: 41min
completed: 2026-02-03
---

# Phase 1 Plan 1: Project Setup Summary

**Next.js scaffold in next/ with Discord interactions endpoint, ed25519 verification via discord-verify, and PING/PONG validated by Discord Developer Portal**

## Performance

- **Duration:** 41 min
- **Started:** 2026-02-03T11:34:45Z
- **Completed:** 2026-02-03T12:16:08Z
- **Tasks:** 3 (2 auto + 1 checkpoint)
- **Files modified:** 12

## Accomplishments
- Next.js project scaffolded in `next/` subdirectory, separate from existing gateway bot in `src/`
- Discord interactions endpoint at `/api/interactions` with ed25519 signature verification
- PING/PONG handler validated by Discord Developer Portal
- Placeholder ApplicationCommand response (ephemeral)
- Deployed to Vercel with Discord endpoint URL configured

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js project** - `b056484` (feat)
2. **Task 2: Create Discord interactions endpoint** - `bbbb840` (feat)
3. **Task 3: Verify Discord accepts endpoint** - checkpoint (human-verify, approved)

## Files Created/Modified
- `next/package.json` - Next.js project with discord-verify and discord-api-types
- `next/tsconfig.json` - TypeScript config with @/* import alias
- `next/next.config.ts` - Next.js config
- `next/app/api/interactions/route.ts` - POST handler with signature verification, PING/PONG, placeholder command response
- `next/lib/discord/verify.ts` - Signature verification wrapper using verify() from discord-verify/node
- `next/app/page.tsx` - Simplified to "Urenlogger API" text
- `next/app/layout.tsx` - Cleaned up for API-only app
- `next/.env.example` - Discord env vars (PUBLIC_KEY, APPLICATION_ID, BOT_TOKEN, GUILD_ID)
- `next/.gitignore` - Default Next.js gitignore

## Decisions Made
- Used `verify()` from `discord-verify/node` instead of `isValidRequest` — the latter expects a full Request object with `.headers` and `.text()`, but the plan requires reading body with `req.text()` first (body can only be consumed once). The lower-level `verify()` accepts individual parameters (rawBody, signature, timestamp, publicKey, subtleCrypto).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used verify() instead of isValidRequest from discord-verify**
- **Found during:** Task 2 (Create interactions endpoint)
- **Issue:** Research noted `isValidRequest` from `discord-verify/node`, but its API expects a full Request object and doesn't match the plan's requirement to read body with `req.text()` first
- **Fix:** Used lower-level `verify()` function which accepts individual rawBody, signature, timestamp, publicKey, subtleCrypto parameters
- **Files modified:** next/lib/discord/verify.ts
- **Verification:** TypeScript compiles clean, Discord accepted endpoint
- **Committed in:** bbbb840 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary for correct signature verification. No scope creep.

## Issues Encountered
None

## Next Phase Readiness
- Interactions endpoint working and validated by Discord
- Ready for Phase 2: Command Migration — port all 6 slash commands through the interactions endpoint
- Node.js runtime set, ready for firebase-admin integration

---
*Phase: 01-project-setup*
*Completed: 2026-02-03*
