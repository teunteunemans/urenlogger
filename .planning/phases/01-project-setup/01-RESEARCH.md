# Phase 1: Project Setup - Research

**Researched:** 2026-02-03
**Domain:** Discord Interactions Endpoint on Vercel (Next.js serverless)
**Confidence:** HIGH

<research_summary>
## Summary

Researched how to build a serverless Discord bot on Vercel using Next.js and Discord's HTTP Interactions Endpoint. Instead of maintaining a persistent WebSocket connection (gateway), Discord POSTs interaction events to an HTTPS endpoint. This is the standard approach for serverless Discord bots.

The standard pattern: a single Next.js API route handler at `/api/interactions` receives all Discord POSTs, verifies the ed25519 signature, handles PING/PONG for endpoint validation, and routes slash commands to handlers. For operations exceeding the 3-second response deadline, return a deferred response (type 5) immediately, then use the Discord REST API to edit the original response within 15 minutes.

**Primary recommendation:** Use `discord-verify` for signature verification (WebCrypto-based, works in Edge Runtime), handle raw body via `req.text()` in App Router, and use `discord-api-types` for TypeScript enum/type definitions. Do NOT use discord.js — it's designed for gateway bots and is overkill for interactions-only.
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| discord-verify | latest | Ed25519 signature verification | Uses native WebCrypto (works in Edge Runtime), much faster than tweetnacl-based alternatives |
| discord-api-types | ^0.37.x | TypeScript types for Discord API | Official Discord types — InteractionType, InteractionResponseType enums |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| discord-interactions | ^4.x | Verification + helper enums | Alternative to discord-verify if not using Edge Runtime (uses tweetnacl internally) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| discord-verify | discord-interactions (official) | discord-interactions uses tweetnacl (heavier), not Edge-compatible. discord-verify uses native WebCrypto |
| discord-verify | Manual WebCrypto | discord-verify wraps the boilerplate, handles key import and algorithm details |
| discord-api-types | Raw numeric constants | Types give autocomplete and type safety for interaction handling |
| Raw Discord REST API | discord.js | discord.js requires gateway connection, massive dependency — overkill for HTTP interactions |

**Installation:**
```bash
npm install discord-verify discord-api-types
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```
app/
├── api/
│   └── interactions/
│       └── route.ts          # Discord interactions endpoint (POST handler)
├── lib/
│   ├── discord/
│   │   ├── verify.ts         # Signature verification wrapper
│   │   ├── commands.ts       # Command routing map
│   │   └── respond.ts        # Deferred reply + followup helpers
│   ├── firebase.ts           # Firebase service (ported from existing)
│   ├── date-parser.ts        # Date parsing (ported from existing)
│   └── email.ts              # Email service (ported from existing)
├── commands/
│   ├── registreer.ts         # Each command handler
│   ├── log.ts
│   ├── wijzig.ts
│   ├── verwijder.ts
│   ├── uren.ts
│   └── email.ts
└── scripts/
    └── register-commands.ts  # One-time command registration script
```

### Pattern 1: Interactions Route Handler
**What:** Single POST handler that verifies signature, handles PING, and routes commands
**When to use:** All Discord interaction bots on Vercel
**Example:**
```typescript
// app/api/interactions/route.ts
import { InteractionType, InteractionResponseType } from 'discord-api-types/v10';

export async function POST(req: Request) {
  // 1. Read raw body for signature verification
  const rawBody = await req.text();
  const signature = req.headers.get('x-signature-ed25519')!;
  const timestamp = req.headers.get('x-signature-timestamp')!;

  // 2. Verify signature
  const isValid = await verifyRequest(rawBody, signature, timestamp);
  if (!isValid) {
    return new Response('Invalid signature', { status: 401 });
  }

  // 3. Parse interaction
  const interaction = JSON.parse(rawBody);

  // 4. Handle PING (Discord endpoint validation)
  if (interaction.type === InteractionType.Ping) {
    return Response.json({ type: InteractionResponseType.Pong });
  }

  // 5. Route to command handler
  if (interaction.type === InteractionType.ApplicationCommand) {
    return handleCommand(interaction);
  }

  return new Response('Unknown interaction type', { status: 400 });
}
```

### Pattern 2: Deferred Reply + Followup
**What:** Return deferred response immediately, then edit via REST API within 15 minutes
**When to use:** Any command that needs >3 seconds (Firebase queries, email sending)
**Example:**
```typescript
async function handleCommand(interaction: APIChatInputApplicationCommandInteraction) {
  const commandName = interaction.data.name;

  // Return deferred response immediately (shows "Bot is thinking...")
  // Then process in background
  const handler = commands.get(commandName);
  if (!handler) {
    return Response.json({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { content: 'Onbekend commando', flags: 64 } // 64 = ephemeral
    });
  }

  // For simple responses (< 3 seconds):
  // return Response.json({
  //   type: InteractionResponseType.ChannelMessageWithSource,
  //   data: { content: 'Hello!', flags: 64 }
  // });

  // For deferred responses:
  // Return the deferred ACK immediately
  // Use waitUntil or similar to process in background
  return deferAndProcess(interaction, handler);
}
```

### Pattern 3: Deferred Response with Background Processing
**What:** Return deferred ACK, then use Discord webhook API to send the actual response
**When to use:** Firebase queries, email operations — anything over 3 seconds
**Example:**
```typescript
async function deferAndProcess(
  interaction: APIChatInputApplicationCommandInteraction,
  handler: CommandHandler
) {
  // Start background processing (fires and forgets)
  // In Vercel, the function continues executing after returning the response
  // as long as it's within the function timeout (Pro: 60s, Hobby: 10s)
  const processingPromise = handler(interaction)
    .then(content => editOriginalResponse(interaction.token, content))
    .catch(err => editOriginalResponse(interaction.token, 'Er is een fout opgetreden.'));

  // Use waitUntil if available (Vercel Edge), otherwise just don't await
  // The key: return the deferred ACK immediately
  return Response.json({
    type: InteractionResponseType.DeferredChannelMessageWithSource,
    data: { flags: 64 } // 64 = ephemeral
  });
}

async function editOriginalResponse(token: string, content: string) {
  const appId = process.env.DISCORD_APPLICATION_ID;
  await fetch(
    `https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    }
  );
}
```

### Anti-Patterns to Avoid
- **Using discord.js for interactions-only bot:** Massive dependency, designed for gateway. Use raw API types + fetch instead
- **Parsing body with `req.json()` before signature verification:** Must use `req.text()` first, then `JSON.parse()` after verification
- **Forgetting PING/PONG handler:** Discord validates your endpoint with PING — if you don't respond with PONG, the endpoint is rejected
- **Blocking the response for >3 seconds:** Always defer first, then process. Never await Firebase/email before returning
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Ed25519 verification | Manual crypto.subtle calls | `discord-verify` | Key import, algorithm params, hex encoding — easy to get wrong |
| Interaction types | Magic numbers (1, 2, 4, 5) | `discord-api-types` enums | Type safety, autocomplete, self-documenting code |
| Command registration | Manual fetch to Discord API | Reuse existing `deploy-commands.ts` pattern with `@discordjs/rest` | Already have working registration script |

**Key insight:** The interaction handling itself IS simple — it's just HTTP request/response. The signature verification is the only tricky part, and `discord-verify` handles it. Don't overthink this with heavy frameworks.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Body Consumed Before Verification
**What goes wrong:** Calling `req.json()` before signature verification makes raw body unavailable
**Why it happens:** In Next.js App Router, the request body can only be consumed once
**How to avoid:** Always use `const rawBody = await req.text()` first, then `JSON.parse(rawBody)` after verification
**Warning signs:** Signature verification always fails, 401 responses

### Pitfall 2: Exceeding 3-Second Response Deadline
**What goes wrong:** Discord invalidates the interaction token, user sees "interaction failed"
**Why it happens:** Awaiting Firebase/external calls before returning the HTTP response
**How to avoid:** Return deferred response (type 5) immediately, then edit via REST API. Firebase queries happen after the initial response is sent
**Warning signs:** Intermittent "This interaction failed" errors in Discord

### Pitfall 3: Discord Removes Your Endpoint URL
**What goes wrong:** Discord silently disables your interactions endpoint
**Why it happens:** Discord periodically sends invalid signatures to test verification. If your endpoint doesn't return 401 for invalid signatures, Discord removes it
**How to avoid:** Always verify signatures, never skip in production. Test with both valid and invalid signatures
**Warning signs:** Bot stops responding to all commands, no errors in your logs

### Pitfall 4: Ephemeral Flag as Magic Number
**What goes wrong:** Responses visible to all channel members instead of just the user
**Why it happens:** Forgetting to set `flags: 64` (MessageFlags.Ephemeral) in response data
**How to avoid:** Use `MessageFlags.Ephemeral` from discord-api-types or document the constant
**Warning signs:** Other users can see command responses

### Pitfall 5: Edge Runtime vs Node.js Runtime
**What goes wrong:** Firebase Admin SDK fails in Edge Runtime
**Why it happens:** firebase-admin requires Node.js APIs (fs, net, etc.) not available in Edge
**How to avoid:** Use Node.js runtime (`export const runtime = 'nodejs'`) for the interactions route, NOT Edge Runtime. Edge is only suitable if you don't need Node.js-specific packages
**Warning signs:** "Module not found" errors for Node.js built-ins at deploy time
</common_pitfalls>

<code_examples>
## Code Examples

### Signature Verification with discord-verify
```typescript
// lib/discord/verify.ts
import { isValidRequest } from 'discord-verify/node';
import { subtle } from 'node:crypto';

const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY!;

export async function verifyDiscordRequest(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
): Promise<boolean> {
  if (!signature || !timestamp) return false;

  return isValidRequest(
    { body: rawBody, signature, timestamp },
    PUBLIC_KEY,
    subtle,
  );
}
```

### Complete Route Handler Skeleton
```typescript
// app/api/interactions/route.ts
import { InteractionType, InteractionResponseType } from 'discord-api-types/v10';
import { verifyDiscordRequest } from '@/lib/discord/verify';

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-signature-ed25519');
  const timestamp = req.headers.get('x-signature-timestamp');

  const isValid = await verifyDiscordRequest(rawBody, signature, timestamp);
  if (!isValid) {
    return new Response('Invalid signature', { status: 401 });
  }

  const interaction = JSON.parse(rawBody);

  if (interaction.type === InteractionType.Ping) {
    return Response.json({ type: InteractionResponseType.Pong });
  }

  if (interaction.type === InteractionType.ApplicationCommand) {
    // Route to command handler
    return handleCommand(interaction);
  }

  return new Response('Unknown type', { status: 400 });
}
```

### Editing Deferred Response via REST API
```typescript
// lib/discord/respond.ts
const DISCORD_API = 'https://discord.com/api/v10';

export async function editOriginalResponse(
  applicationId: string,
  interactionToken: string,
  content: string,
) {
  const url = `${DISCORD_API}/webhooks/${applicationId}/${interactionToken}/messages/@original`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    console.error('Failed to edit response:', await response.text());
  }
}
```

### Command Registration Script
```typescript
// scripts/register-commands.ts
// Reuse existing pattern from deploy-commands.ts
const DISCORD_API = 'https://discord.com/api/v10';

async function registerCommands() {
  const commands = [/* command definitions */];

  // Guild-specific (for development):
  const guildUrl = `${DISCORD_API}/applications/${APP_ID}/guilds/${GUILD_ID}/commands`;

  // Global (for production):
  // const globalUrl = `${DISCORD_API}/applications/${APP_ID}/commands`;

  const response = await fetch(guildUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bot ${BOT_TOKEN}`,
    },
    body: JSON.stringify(commands),
  });

  console.log('Registered commands:', await response.json());
}
```
</code_examples>

<sota_updates>
## State of the Art (2025-2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| tweetnacl for ed25519 | WebCrypto (discord-verify) | 2023+ | No native dependency, works in Edge/serverless |
| discord.js for all bots | Raw API + discord-api-types for HTTP bots | 2022+ | Dramatically smaller bundle, no gateway dependency |
| Pages Router API routes | App Router route handlers | Next.js 13+ (2023) | `req.text()` for raw body, no bodyParser config needed |
| body-parser middleware | Native Web Request API | Next.js 13+ | `await req.text()` directly, simpler code |

**New tools/patterns to consider:**
- **NextBot template (jzxhuang):** Well-maintained Next.js Discord bot template on Vercel, good reference implementation
- **Vercel waitUntil:** For running background work after returning response (useful for deferred replies)

**Deprecated/outdated:**
- **discord.js for serverless bots:** Overkill, designed for gateway
- **Pages Router `config.api.bodyParser`:** App Router doesn't need this, use `req.text()` directly
- **tweetnacl for verification:** Slower than native WebCrypto alternatives
</sota_updates>

<open_questions>
## Open Questions

1. **Vercel function timeout for deferred processing**
   - What we know: Hobby plan has 10s timeout, Pro has 60s. Deferred replies give 15 minutes window via Discord REST API
   - What's unclear: Whether the function stays alive after returning the deferred response to process Firebase queries. Vercel may terminate the function after the response is sent
   - Recommendation: Test with real Firebase queries. If function terminates early, may need to split into two routes: one for the ACK, one triggered internally for processing. Alternatively, use `waitUntil()` API if available

2. **Node.js runtime vs Edge runtime**
   - What we know: firebase-admin needs Node.js runtime. discord-verify works in both. Edge has no cold starts but limited API
   - What's unclear: Whether Node.js runtime cold starts are acceptable for the 3-second Discord deadline
   - Recommendation: Use Node.js runtime since firebase-admin requires it. The PING/PONG and deferred ACK responses are instant — cold start only affects the background processing which has 15 minutes
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- [discord-interactions-js README](https://github.com/discord/discord-interactions-js/blob/main/README.md) — Official Discord verification library, API docs
- [discord-api-types InteractionType](https://discord-api-types.dev/api/discord-api-types-v10/enum/InteractionType) — All interaction type values
- [discord-api-types InteractionResponseType](https://discord-api-types.dev/api/discord-api-types-v10/enum/InteractionResponseType) — All response type values
- [NextBot template](https://github.com/jzxhuang/nextjs-discord-bot) — Working Next.js + Discord + Vercel reference implementation

### Secondary (MEDIUM confidence)
- [Ian Mitchell's guide](https://ianmitchell.dev/blog/deploying-a-discord-bot-as-a-vercel-serverless-function) — Verified against official Discord docs
- [Next.js Route Handlers docs](https://nextjs.org/docs/app/api-reference/file-conventions/route) — App Router raw body handling
- [discord.js guide: Command deployment](https://discordjs.guide/creating-your-bot/command-deployment.html) — Verified REST API endpoints for command registration

### Tertiary (LOW confidence - needs validation)
- Vercel `waitUntil()` behavior for background processing after response — needs testing during implementation
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: Discord Interactions Endpoint + Next.js App Router
- Ecosystem: discord-verify, discord-api-types, discord-interactions
- Patterns: Signature verification, deferred replies, command routing, REST API followups
- Pitfalls: Body consumption, 3-second deadline, endpoint validation, runtime selection

**Confidence breakdown:**
- Standard stack: HIGH — verified with official Discord repos and npm packages
- Architecture: HIGH — verified with NextBot template and multiple implementations
- Pitfalls: HIGH — documented in Discord developer docs and community experience
- Code examples: HIGH — based on official library READMEs and Discord API docs

**Research date:** 2026-02-03
**Valid until:** 2026-03-03 (30 days — Discord API stable, Next.js patterns stable)
</metadata>

---

*Phase: 01-project-setup*
*Research completed: 2026-02-03*
*Ready for planning: yes*
