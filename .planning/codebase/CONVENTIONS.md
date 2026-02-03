# Coding Conventions

**Analysis Date:** 2026-02-03

## Naming Patterns

**Files:**
- camelCase for utility files (`firebaseService.ts`, `dateParser.ts`, `envValidator.ts`)
- Lowercase for command files matching Discord names (`registreer.ts`, `log.ts`, `wijzig.ts`)
- No test files exist (no test naming convention established)

**Functions:**
- camelCase for all functions (`logHours`, `getUser`, `parseDateString`, `formatDateToYYYYMMDD`)
- No special prefix for async functions
- Verb-first naming (`get*`, `update*`, `delete*`, `register*`, `send*`, `parse*`)

**Variables:**
- camelCase for variables (`discordUserId`, `registeredName`, `billingPeriod`)
- UPPER_SNAKE_CASE for constants (`BILLING_PERIOD`, `DUTCH_MONTHS`, `DISCORD_MESSAGE_LIMIT`, `EMAIL_REGEX`)

**Types:**
- PascalCase for interfaces, no I prefix (`User`, `HourLog`, `BillingPeriod`, `MonthlyReport`)
- PascalCase for type aliases (`UserHoursSummary`, `ValidationResult`)

## Code Style

**Formatting:**
- No Prettier or formatting tool configured
- 2 space indentation (consistent across all files)
- Double quotes for all strings
- Semicolons required on all statements
- Consistent style maintained by convention

**Linting:**
- No ESLint or linting tool configured
- Style consistency maintained manually

## Import Organization

**Order (observed pattern):**
1. Node.js built-ins / dotenv
2. External packages (discord.js, firebase-admin, date-fns, nodemailer)
3. Internal modules (relative imports: `../utils/*`, `../config/*`, `../i18n/*`)
4. Type imports mixed with value imports

**Path Style:**
- Relative imports (`../utils/firebaseService`, `../config/constants`)
- No path aliases configured

## Error Handling

**Patterns:**
- Try-catch at command handler level in all `execute()` functions
- Errors logged via `console.error` with context
- User-friendly Dutch error messages returned from `src/i18n/nl.ts`
- Deferred replies used before async operations: `interaction.deferReply({ ephemeral: true })`

**Error Types:**
- No custom error classes
- Standard Error objects thrown/caught
- Validation failures return early with error message to user

## Logging

**Framework:**
- console.log / console.error (no structured logging library)

**Patterns:**
- `console.log` for informational messages
- `console.error` for error conditions
- Emoji prefixes in log messages (e.g., `console.log("Bot is logged in as...")`)
- Discord log channel used for report status notifications

## Comments

**When to Comment:**
- JSDoc-style `/** */` for exported utility functions
- Inline comments for complex logic (e.g., date parsing edge cases)
- English for technical comments, Dutch for user-facing strings

**JSDoc:**
- Used on most exported functions in utility files
- Not consistently applied to command handlers

**TODO Comments:**
- None found in codebase

## Function Design

**Size:**
- Most functions under 50 lines
- Notable exceptions: `generateHtmlReport()` in `src/utils/email.ts` (~175 lines), `parseDateString()` in `src/utils/dateParser.ts` (~80 lines)

**Parameters:**
- Typed parameters using interfaces from `src/types.ts`
- Discord interaction objects passed as-is to command handlers

**Return Values:**
- Async functions return Promise<void> (commands) or Promise<T> (services)
- Service functions return document IDs or data objects

## Module Design

**Exports:**
- Named exports for all functions and constants
- Commands export `data` (SlashCommandBuilder) and `execute` (async function)
- No default exports used

**Command Module Pattern:**
```typescript
export const data = new SlashCommandBuilder()...
export async function execute(interaction: ChatInputCommandInteraction): Promise<void>
```

**Internationalization Pattern:**
- All user-facing messages in `src/i18n/nl.ts`
- Function-based messages for dynamic content: `messages.registreer.success(name)`
- Commands import messages via `import { messages, descriptions } from "../i18n/nl"`

---

*Convention analysis: 2026-02-03*
*Update when patterns change*
