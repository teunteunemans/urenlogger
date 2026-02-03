import {
  InteractionType,
  InteractionResponseType,
} from "discord-api-types/v10";
import { verifyDiscordRequest } from "@/lib/discord/verify";
import { handleCommand } from "@/lib/discord/commands";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Read raw body FIRST — body can only be consumed once
  const rawBody = await req.text();

  // Extract signature headers
  const signature = req.headers.get("x-signature-ed25519");
  const timestamp = req.headers.get("x-signature-timestamp");

  // Verify ed25519 signature
  const isValid = await verifyDiscordRequest(rawBody, signature, timestamp);
  if (!isValid) {
    return new Response("Invalid signature", { status: 401 });
  }

  // Parse body AFTER verification
  const interaction = JSON.parse(rawBody);

  // Handle PING (Discord endpoint validation)
  if (interaction.type === InteractionType.Ping) {
    return Response.json({ type: InteractionResponseType.Pong });
  }

  // Handle slash commands
  if (interaction.type === InteractionType.ApplicationCommand) {
    return handleCommand(interaction);
  }

  return new Response("Unknown interaction type", { status: 400 });
}
