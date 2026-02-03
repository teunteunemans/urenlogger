# External Integrations

**Analysis Date:** 2026-02-03

## APIs & External Services

**Discord Bot API:**
- discord.js 14.7.1 - Slash command bot with interaction handling
  - SDK/Client: discord.js + @discordjs/rest + @discordjs/builders
  - Auth: Bot token in `DISCORD_TOKEN` env var
  - Gateway intents: `GatewayIntentBits.Guilds` (minimal permissions)
  - Commands: `/registreer`, `/log`, `/wijzig`, `/verwijder`, `/uren`, `/email`
  - Files: `src/index.ts` (client setup), `src/deploy-commands.ts` (command registration), `src/commands/*.ts`

**Email/SMS:**
- Gmail SMTP via Nodemailer - Monthly billing reports
  - SDK/Client: nodemailer 6.9.1
  - Auth: SMTP credentials in `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` env vars
  - Features: Plain text + HTML reports, CC to registered users
  - File: `src/utils/email.ts`

**External APIs:**
- Not detected (no third-party REST/GraphQL integrations beyond Discord and Firebase)

## Data Storage

**Databases:**
- Google Cloud Firestore via firebase-admin 11.4.1
  - Connection: Service account JSON file via `GOOGLE_APPLICATION_CREDENTIALS` env var
  - Client: firebase-admin SDK (singleton initialization with Promise-based concurrency safety)
  - Collections:
    - `hour_logs` - Work hours entries (discordUserId, discordUsername, hours, date, description, logTimestamp)
    - `users` - User registration data (discordUserId, registeredName, registeredAt, email, updatedAt)
  - File: `src/utils/firebaseService.ts`

**File Storage:**
- Not detected

**Caching:**
- Not detected

## Authentication & Identity

**Auth Provider:**
- Discord OAuth (implicit via bot interaction) - Users identified by Discord ID
  - No separate auth system; users are authenticated through Discord's platform
  - User registration stores Discord ID -> name mapping in Firestore

**Service Authentication:**
- Firebase: Service account JSON file (mounted read-only in Docker)
- SMTP: Username/password (Gmail App Password)

## Monitoring & Observability

**Error Tracking:**
- Not detected (console.log/console.error only)

**Analytics:**
- Not detected

**Logs:**
- stdout/stderr via console.log/console.error
- Docker JSON-file logging driver (10MB max, 3 file rotation)
- Discord log channel for report success/failure notifications (`LOG_CHANNEL_ID`)

## CI/CD & Deployment

**Hosting:**
- Docker container (self-hosted)
  - `Dockerfile` - Multi-stage build with node:20-alpine
  - `docker-compose.yml` - Service orchestration with health checks
  - `build.sh` - Build automation script

**CI Pipeline:**
- GitHub Actions (`.github/` directory present)

## Environment Configuration

**Development:**
- Required env vars: See `.env.example`
- Secrets location: `.env` file (gitignored)
- Firebase service account JSON file (gitignored)

**Production:**
- Docker environment variables
- Service account JSON mounted as read-only volume
- Non-root container user for security

## Webhooks & Callbacks

**Incoming:**
- Not detected

**Outgoing:**
- Not detected

## Scheduled Tasks

**Monthly Report Cron:**
- node-cron schedules report generation
- Default: `0 0 21 * *` (midnight UTC on 21st of each month)
- Configurable via `CRON_SCHEDULE` env var
- Sends email report + posts status to Discord log channel
- File: `src/index.ts`

---

*Integration audit: 2026-02-03*
*Update when adding/removing external services*
