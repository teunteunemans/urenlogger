import {
  APIApplicationCommandInteraction,
  InteractionResponseType,
  MessageFlags,
} from "discord-api-types/v10";

/**
 * Command handler type — receives an interaction and returns the response message content
 */
export type CommandHandler = (
  interaction: APIApplicationCommandInteraction
) => Promise<string>;

/**
 * Registry of command handlers mapped by command name
 */
const commands = new Map<string, CommandHandler>();

// Register placeholder handlers for all 6 commands
commands.set("registreer", async () => "Command not yet implemented");
commands.set("log", async () => "Command not yet implemented");
commands.set("wijzig", async () => "Command not yet implemented");
commands.set("verwijder", async () => "Command not yet implemented");
commands.set("uren", async () => "Command not yet implemented");
commands.set("email", async () => "Command not yet implemented");

/**
 * Send a follow-up response to a deferred interaction via Discord REST API.
 * PATCHes the original deferred response with the actual content.
 */
async function sendFollowUp(
  interaction: APIApplicationCommandInteraction,
  content: string
): Promise<void> {
  const appId = process.env.DISCORD_APPLICATION_ID;

  if (!appId) {
    console.error("DISCORD_APPLICATION_ID not set, cannot send follow-up");
    return;
  }

  try {
    const response = await fetch(
      `https://discord.com/api/v10/webhooks/${appId}/${interaction.token}/messages/@original`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          flags: MessageFlags.Ephemeral,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Discord follow-up failed (${response.status}): ${errorText}`);
    }
  } catch (error) {
    console.error("Failed to send Discord follow-up:", error);
  }
}

/**
 * Handle an incoming ApplicationCommand interaction.
 *
 * Returns a DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE response immediately,
 * then executes the command handler asynchronously and sends the real
 * response via Discord REST API (PATCH to original message).
 */
export async function handleCommand(
  interaction: APIApplicationCommandInteraction
): Promise<Response> {
  const commandName = interaction.data.name;
  const handler = commands.get(commandName);

  if (!handler) {
    // Unknown command — respond immediately with error
    return Response.json({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: `Onbekend commando: ${commandName}`,
        flags: MessageFlags.Ephemeral,
      },
    });
  }

  // Fire-and-forget: execute the handler asynchronously and send follow-up
  // Do NOT await — we need to return the deferred response within 3 seconds
  void (async () => {
    try {
      const message = await handler(interaction);
      await sendFollowUp(interaction, message);
    } catch (error) {
      console.error(`Error executing command "${commandName}":`, error);
      await sendFollowUp(
        interaction,
        "Er is een fout opgetreden bij het uitvoeren van dit commando!"
      );
    }
  })();

  // Return deferred response immediately
  return Response.json({
    type: InteractionResponseType.DeferredChannelMessageWithSource,
    data: {
      flags: MessageFlags.Ephemeral,
    },
  });
}
