# Architecture

**Analysis Date:** 2026-02-03

## Pattern Overview

**Overall:** Event-Driven Command Handler (Discord Bot)

**Key Characteristics:**
- Single-process Discord bot with slash command handling
- Event-driven interaction model (Discord gateway events)
- Stateless command execution (no in-memory state between commands)
- Scheduled task (cron) for automated monthly reports

## Layers

**Command Layer:**
- Purpose: Handle Discord slash command interactions
- Contains: Command definitions (SlashCommandBuilder) and execute handlers
- Location: `src/commands/*.ts`
- Depends on: Service layer (firebaseService), utilities (dateParser, i18n)
- Used by: Event handler in `src/index.ts`

**Service Layer:**
- Purpose: All Firestore database operations (CRUD)
- Contains: User management, hour log operations, batch operations
- Location: `src/utils/firebaseService.ts`
- Depends on: firebase-admin SDK, `src/types.ts`
- Used by: Command layer, email module

**Utility Layer:**
- Purpose: Shared helpers for date parsing, email, validation
- Contains: Date parsing, email report generation, environment validation
- Location: `src/utils/dateParser.ts`, `src/utils/email.ts`, `src/utils/envValidator.ts`
- Depends on: date-fns, nodemailer, config/constants
- Used by: Command layer, scheduled tasks

**Configuration Layer:**
- Purpose: Centralized constants and localization
- Contains: App constants, Dutch month mappings, billing period config, i18n messages
- Location: `src/config/constants.ts`, `src/i18n/nl.ts`
- Depends on: Nothing
- Used by: All layers

**Type Layer:**
- Purpose: Shared TypeScript interfaces
- Contains: User, HourLog, BillingPeriod, MonthlyReport, UserHoursSummary
- Location: `src/types.ts`
- Depends on: Nothing
- Used by: All layers

## Data Flow

**Slash Command Execution:**

1. User triggers `/command` in Discord
2. Discord.js `interactionCreate` event fired (`src/index.ts`)
3. Command handler retrieves matching command from Collection
4. Command's `execute()` function called with interaction
5. Command validates user registration via `getUser()`
6. Input parsed (dateParser for dates, options for other fields)
7. Service layer performs Firestore CRUD operation
8. Ephemeral response sent back to Discord user

**Monthly Report Generation:**

1. Cron triggers at scheduled time (`src/index.ts`)
2. Billing period calculated (22nd prev month to 21st current month)
3. All hour logs fetched for date range (`firebaseService.getHoursByDateRange`)
4. Hours aggregated by user
5. Plain text + HTML email report generated (`src/utils/email.ts`)
6. Email sent via Nodemailer SMTP to boss + CC users
7. Success/failure posted to Discord log channel

**State Management:**
- Stateless per command (no in-memory state)
- All persistent state in Firestore (users, hour_logs collections)

## Key Abstractions

**Command Module:**
- Purpose: Standardized Discord slash command
- Examples: `src/commands/log.ts`, `src/commands/uren.ts`, `src/commands/registreer.ts`
- Pattern: Each file exports `data` (SlashCommandBuilder) and `execute` (async handler)

**Firebase Singleton:**
- Purpose: Thread-safe database connection
- Location: `src/utils/firebaseService.ts`
- Pattern: Promise-based singleton initialization preventing race conditions

**Date Parser:**
- Purpose: Flexible date input handling with Dutch locale
- Location: `src/utils/dateParser.ts`
- Pattern: Multi-format parser supporting Dutch keywords ("vandaag", "gisteren"), month names, and standard formats

## Entry Points

**Main Bot Application:**
- Location: `src/index.ts`
- Triggers: `npm start` / `node dist/index.js`
- Responsibilities: Initialize Discord client, register commands, handle interactions, schedule cron

**Command Deployment:**
- Location: `src/deploy-commands.ts`
- Triggers: `npm run deploy`
- Responsibilities: Register slash commands with Discord API via REST

## Error Handling

**Strategy:** Try-catch at command level, ephemeral error messages to user

**Patterns:**
- All command `execute()` functions wrapped in try-catch
- Errors logged to console with `console.error`
- User-friendly Dutch error messages from `src/i18n/nl.ts`
- Deferred replies (`interaction.deferReply({ ephemeral: true })`) for all commands
- Cron job errors posted to Discord log channel

## Cross-Cutting Concerns

**Logging:**
- console.log/console.error (no structured logging framework)
- Discord log channel for report status notifications

**Validation:**
- Environment validation at startup (`src/utils/envValidator.ts`)
- User registration check before command execution
- Date validation in dateParser (no future dates)

**Internationalization:**
- All user-facing messages centralized in `src/i18n/nl.ts`
- Dutch command names, descriptions, and responses

---

*Architecture analysis: 2026-02-03*
*Update when major patterns change*
