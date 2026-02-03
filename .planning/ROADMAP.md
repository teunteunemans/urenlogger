# Roadmap: Urenlogger

## Overview

Rewrite the existing Docker-hosted Discord bot as a serverless Next.js application on Vercel. Migrate from WebSocket gateway to Discord's HTTP Interactions Endpoint, port all 6 commands and the monthly report cron, and deploy to Vercel with zero ongoing maintenance.

## Domain Expertise

None

## Phases

- [x] **Phase 1: Project Setup** - Next.js scaffold, Discord interactions endpoint with ed25519 verification
- [x] **Phase 2: Command Migration** - Port all 6 commands, Firebase service, date parser, i18n, and email
- [x] **Phase 3: Cron & Deployment** - Vercel Cron Job for monthly report, deployment config, command registration

## Phase Details

### Phase 1: Project Setup
**Goal**: Working Next.js project with a Discord interactions endpoint that verifies signatures and responds to pings
**Depends on**: Nothing (first phase)
**Research**: Likely (Discord Interactions Endpoint is a new integration pattern)
**Research topics**: Discord Interactions Endpoint setup, ed25519 signature verification, interaction response types, Next.js API route structure for Discord
**Plans**: TBD

Plans:
- [x] 01-01: Next.js scaffold + Discord interactions endpoint

### Phase 2: Command Migration
**Goal**: All 6 slash commands working via the interactions endpoint with Firebase and Dutch date parsing
**Depends on**: Phase 1
**Research**: Unlikely (porting existing business logic with established patterns)
**Plans**: TBD

Plans:
- [x] 02-01: Foundation & command dispatch router
- [x] 02-02: Port all 6 commands & email utility

### Phase 3: Cron & Deployment
**Goal**: Monthly report via Vercel Cron Job, deployment to Vercel, Discord command registration
**Depends on**: Phase 2
**Research**: Likely (Vercel Cron Jobs configuration, vercel.json setup)
**Research topics**: Vercel Cron Jobs syntax and configuration, vercel.json for cron routes, environment variable setup on Vercel
**Plans**: TBD

Plans:
- [x] 03-01: Vercel Cron Job, command registration, deployment config

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Project Setup | 1/1 | Complete | 2026-02-03 |
| 2. Command Migration | 2/2 | Complete | 2026-02-03 |
| 3. Cron & Deployment | 1/1 | Complete | 2026-02-03 |
