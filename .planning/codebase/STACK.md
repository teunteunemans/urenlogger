# Technology Stack

**Analysis Date:** 2026-02-03

## Languages

**Primary:**
- TypeScript 5.3.3 - All application code (`package.json`, `tsconfig.json`)

**Secondary:**
- JavaScript - Compiled output in `dist/`, config files

## Runtime

**Environment:**
- Node.js 20 LTS (Alpine) - specified in `Dockerfile`
- No browser runtime (Discord bot only)

**Package Manager:**
- npm (v3 lockfile format)
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- discord.js 14.7.1 - Discord bot framework (`src/index.ts`, `src/commands/*`)
- @discordjs/builders 1.4.0 - Slash command construction
- @discordjs/rest 1.5.0 - Discord REST API client (`src/deploy-commands.ts`)

**Testing:**
- None configured

**Build/Dev:**
- TypeScript compiler (tsc) - `npm run build`
- ts-node 10.9.2 - Development mode (`npm run dev`)
- Docker & Docker Compose - Containerized deployment

## Key Dependencies

**Critical:**
- firebase-admin 11.4.1 - Firestore database access (`src/utils/firebaseService.ts`)
- nodemailer 6.9.1 - SMTP email sending (`src/utils/email.ts`)
- date-fns 2.29.3 + date-fns-tz 2.0.0 - Date parsing with Dutch locale support (`src/utils/dateParser.ts`)
- node-cron 3.0.2 - Monthly report scheduling (`src/index.ts`)

**Infrastructure:**
- dotenv 16.0.3 - Environment variable loading
- discord-api-types 0.37.20 - TypeScript types for Discord API

## Configuration

**Environment:**
- `.env` files via dotenv (`.env.example` documents all variables)
- Required: `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`, `GOOGLE_APPLICATION_CREDENTIALS`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `YOUR_EMAIL_ADDRESS`, `BOSS_EMAIL`
- Optional: `LOG_CHANNEL_ID`, `CRON_SCHEDULE`
- Runtime validation via `src/utils/envValidator.ts`

**Build:**
- `tsconfig.json` - Strict mode, ES2020 target, CommonJS modules, output to `dist/`

## Platform Requirements

**Development:**
- Any platform with Node.js 20+
- Firebase service account JSON file
- Discord bot token and guild access

**Production:**
- Docker container (node:20-alpine)
- 512MB memory limit, 0.5 CPU cores
- Health check every 30s
- Non-root user (`discordbot`, UID 1001)

---

*Stack analysis: 2026-02-03*
*Update after major dependency changes*
