# Urenlogger

## What This Is

A Dutch-language Discord bot for logging work hours, deployed as a serverless Next.js application on Vercel. Team members register, log hours via slash commands, and receive automated monthly billing reports via email. Rewrite of an existing Docker-hosted bot to eliminate server maintenance.

## Core Value

Zero-maintenance hosting — deploy to Vercel and forget. No Docker, no server management, no infrastructure babysitting.

## Requirements

### Validated

- ✓ User registration via `/registreer` command — existing
- ✓ Hour logging via `/log` command with flexible Dutch date parsing — existing
- ✓ Hour editing via `/wijzig` command — existing
- ✓ Hour deletion via `/verwijder` command — existing
- ✓ Hour viewing via `/uren` command (current period + historical months) — existing
- ✓ Email management via `/email` command (set, remove, show) — existing
- ✓ Automated monthly billing reports via email (22nd-21st billing period) — existing
- ✓ Firebase Firestore for data persistence — existing
- ✓ Dutch localization for all user-facing messages — existing
- ✓ Ephemeral Discord replies for privacy — existing

### Active

- [ ] Discord Interactions Endpoint (HTTP POST) instead of WebSocket gateway
- [ ] Vercel serverless function for handling Discord interactions
- [ ] Vercel Cron Job for monthly report generation (replaces node-cron)
- [ ] Next.js project structure for Vercel deployment
- [ ] Discord interaction signature verification (ed25519)
- [ ] Same 6 slash commands with identical behavior
- [ ] Same monthly email report format and content

### Out of Scope

- Web dashboard or UI — this is a Discord bot only, no frontend needed
- New features or commands — exact feature parity with current bot
- Database migration — staying on Firebase Firestore
- Multi-guild support — single guild as before

## Context

This is a rewrite of an existing, working Discord bot. The current implementation runs as a long-lived Node.js process in Docker, connecting to Discord via WebSocket gateway. The rewrite migrates to Discord's HTTP Interactions Endpoint model, where Discord POSTs interaction events to a Vercel serverless function instead.

Key architectural change: Discord Interactions Endpoint requires ed25519 signature verification on every request, and responses must arrive within 3 seconds (deferred replies extend this). The current codebase already uses deferred replies for all commands.

The existing codebase is in this same repo. Source files in `src/` serve as the reference implementation — same business logic, different hosting model.

Vercel Pro subscription available (longer function timeouts, cron jobs).

## Constraints

- **Platform**: Vercel serverless (Next.js) — must work within Vercel's execution model
- **Response time**: Discord requires initial response within 3 seconds — use deferred replies for longer operations
- **Database**: Firebase Firestore — keep existing database and collections unchanged
- **Feature parity**: All 6 commands + monthly report must work identically to current implementation

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Separate Vercel project (not inside existing website) | Keep bot independent from website deployment lifecycle | — Pending |
| Discord Interactions Endpoint over gateway | Only viable approach for serverless Discord bots | — Pending |
| Next.js for project structure | Natural fit for Vercel, API routes for serverless functions | — Pending |
| Keep Firebase Firestore | No reason to migrate, works fine in serverless | — Pending |
| Vercel Cron Jobs for monthly report | Replaces node-cron, native Vercel feature | — Pending |

---
*Last updated: 2026-02-03 after initialization*
