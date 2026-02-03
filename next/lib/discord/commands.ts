import {
  APIApplicationCommandInteraction,
  APIChatInputApplicationCommandInteraction,
  APIApplicationCommandInteractionDataOption,
  ApplicationCommandOptionType,
  InteractionResponseType,
  MessageFlags,
} from "discord-api-types/v10";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  registerUser,
  getUser,
  updateUserName,
  updateUserEmail,
  removeUserEmail,
  logHours,
  getHoursByUser,
  getHoursByUserAndDay,
  updateHoursForDay,
  deleteHoursForDay,
} from "@/lib/firebase/service";
import {
  parseDateStringWithError,
  formatDateToYYYYMMDD,
  formatDateWithDayDutch,
  getCurrentBillingPeriod,
  parseMonthString,
  validateNotFuture,
} from "@/lib/utils/dateParser";
import { messages } from "@/lib/i18n/nl";
import { DISCORD_MESSAGE_SAFE_LIMIT } from "@/lib/config/constants";

// ─── Option extraction helpers ─────────────────────────────────────

/**
 * Get the user ID from the interaction (works for both guild and DM contexts)
 */
function getUserId(interaction: APIChatInputApplicationCommandInteraction): string {
  return interaction.member?.user.id ?? interaction.user?.id ?? "";
}

/**
 * Extract a string option value from the interaction's top-level options
 */
function getStringOption(
  interaction: APIChatInputApplicationCommandInteraction,
  name: string
): string | null {
  const options = interaction.data.options;
  if (!options) return null;

  const option = options.find(
    (o) => o.name === name && o.type === ApplicationCommandOptionType.String
  );
  if (!option || !("value" in option)) return null;
  return option.value as string;
}

/**
 * Extract a number option value from the interaction's top-level options
 */
function getNumberOption(
  interaction: APIChatInputApplicationCommandInteraction,
  name: string
): number | null {
  const options = interaction.data.options;
  if (!options) return null;

  const option = options.find(
    (o) => o.name === name && o.type === ApplicationCommandOptionType.Number
  );
  if (!option || !("value" in option)) return null;
  return option.value as number;
}

/**
 * Get the name of the subcommand used (e.g., "set", "remove", "show")
 */
function getSubcommand(
  interaction: APIChatInputApplicationCommandInteraction
): string | null {
  const options = interaction.data.options;
  if (!options) return null;

  const sub = options.find(
    (o) => o.type === ApplicationCommandOptionType.Subcommand
  );
  return sub ? sub.name : null;
}

/**
 * Extract an option value from within a subcommand's nested options
 */
function getSubcommandOption(
  interaction: APIChatInputApplicationCommandInteraction,
  name: string
): string | null {
  const options = interaction.data.options;
  if (!options) return null;

  const sub = options.find(
    (o) => o.type === ApplicationCommandOptionType.Subcommand
  ) as
    | (APIApplicationCommandInteractionDataOption & {
        options?: APIApplicationCommandInteractionDataOption[];
      })
    | undefined;

  if (!sub || !("options" in sub) || !sub.options) return null;

  const opt = sub.options.find((o) => o.name === name);
  if (!opt || !("value" in opt)) return null;
  return opt.value as string;
}

// ─── Message splitting (for long /uren responses) ──────────────────

function splitMessage(message: string, maxLength: number): string[] {
  const chunks: string[] = [];
  const lines = message.split("\n");
  let currentChunk = "";

  for (const line of lines) {
    if (line.length > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = "";
      }
      let remaining = line;
      while (remaining.length > maxLength) {
        chunks.push(remaining.substring(0, maxLength));
        remaining = remaining.substring(maxLength);
      }
      if (remaining) {
        currentChunk = remaining + "\n";
      }
    } else if (currentChunk.length + line.length + 1 > maxLength) {
      chunks.push(currentChunk);
      currentChunk = line + "\n";
    } else {
      currentChunk += line + "\n";
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

// ─── Discord REST follow-up helpers ────────────────────────────────

/**
 * Send a follow-up message (POST) to the interaction webhook.
 * Used for additional messages beyond the first PATCH to @original.
 */
async function postFollowUp(
  interaction: APIChatInputApplicationCommandInteraction,
  content: string
): Promise<void> {
  const appId = process.env.DISCORD_APPLICATION_ID;
  if (!appId) {
    console.error("DISCORD_APPLICATION_ID not set, cannot send follow-up");
    return;
  }

  try {
    const response = await fetch(
      `https://discord.com/api/v10/webhooks/${appId}/${interaction.token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          flags: MessageFlags.Ephemeral,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Discord follow-up POST failed (${response.status}): ${errorText}`
      );
    }
  } catch (error) {
    console.error("Failed to POST Discord follow-up:", error);
  }
}

// ─── Email validation ──────────────────────────────────────────────

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

// ─── Command handler type ──────────────────────────────────────────

/**
 * Command handler type -- receives an interaction and returns the response message content
 */
export type CommandHandler = (
  interaction: APIChatInputApplicationCommandInteraction
) => Promise<string>;

// ─── Command implementations ───────────────────────────────────────

async function handleRegistreer(
  interaction: APIChatInputApplicationCommandInteraction
): Promise<string> {
  const name = getStringOption(interaction, "naam");

  if (!name) {
    return messages.registreer.error;
  }

  try {
    const userId = getUserId(interaction);
    const existingUser = await getUser(userId);

    if (existingUser) {
      await updateUserName(userId, name);
      return messages.registreer.updated(existingUser.registeredName, name);
    }

    await registerUser(userId, name);
    return messages.registreer.success(name);
  } catch (error) {
    console.error("Error registering user:", error);
    return messages.registreer.error;
  }
}

async function handleEmail(
  interaction: APIChatInputApplicationCommandInteraction
): Promise<string> {
  try {
    const userId = getUserId(interaction);
    const user = await getUser(userId);

    if (!user) {
      return messages.email.notRegistered;
    }

    const subcommand = getSubcommand(interaction);

    switch (subcommand) {
      case "set": {
        const email = getSubcommandOption(interaction, "address");
        if (!email) {
          return messages.email.error;
        }

        const trimmedEmail = email.trim();
        if (!EMAIL_REGEX.test(trimmedEmail)) {
          return messages.email.invalidFormat;
        }

        await updateUserEmail(userId, trimmedEmail);
        const wasUpdate = !!user.email;
        return messages.email.setSuccess(trimmedEmail, wasUpdate);
      }

      case "remove": {
        if (!user.email) {
          return messages.email.showNone;
        }
        const oldEmail = user.email;
        await removeUserEmail(userId);
        return messages.email.removeSuccess(oldEmail);
      }

      case "show": {
        if (!user.email) {
          return messages.email.showNone;
        }
        return messages.email.showCurrent(user.email);
      }

      default:
        return messages.errors.unknownCommand;
    }
  } catch (error) {
    console.error("Error in /email command:", error);
    return messages.email.error;
  }
}

async function handleVerwijder(
  interaction: APIChatInputApplicationCommandInteraction
): Promise<string> {
  try {
    const userId = getUserId(interaction);
    const user = await getUser(userId);

    if (!user) {
      return messages.verwijder.notRegistered;
    }

    const dateInput = getStringOption(interaction, "datum");
    if (!dateInput) {
      return messages.verwijder.error;
    }

    const parseResult = parseDateStringWithError(dateInput);
    if (!parseResult.success || !parseResult.date) {
      return parseResult.error || messages.verwijder.error;
    }

    const dateString = formatDateToYYYYMMDD(parseResult.date);
    const dateDisplay = formatDateWithDayDutch(parseResult.date);

    const existingLogs = await getHoursByUserAndDay(userId, dateString);

    if (existingLogs.length === 0) {
      return messages.verwijder.noLogsFound(dateDisplay);
    }

    const oldLog = existingLogs[0];

    await deleteHoursForDay(userId, dateString);

    return messages.verwijder.success(
      dateDisplay,
      oldLog.hours,
      oldLog.description || undefined
    );
  } catch (error) {
    console.error("Error deleting hours:", error);
    return messages.verwijder.error;
  }
}

async function handleLog(
  interaction: APIChatInputApplicationCommandInteraction
): Promise<string> {
  try {
    const userId = getUserId(interaction);
    const user = await getUser(userId);

    if (!user) {
      return messages.log.notRegistered;
    }

    const hours = getNumberOption(interaction, "uren");
    if (hours === null) {
      return messages.log.error;
    }

    const description = getStringOption(interaction, "omschrijving");
    const dateInput = getStringOption(interaction, "datum");

    const parseResult = parseDateStringWithError(dateInput || undefined);
    if (!parseResult.success || !parseResult.date) {
      return parseResult.error || messages.log.error;
    }

    const futureValidation = validateNotFuture(parseResult.date);
    if (!futureValidation.valid) {
      return messages.log.futureDateError;
    }

    const dateString = formatDateToYYYYMMDD(parseResult.date);
    const dateDisplay = formatDateWithDayDutch(parseResult.date);

    // Check for duplicate log on same day
    const existingLogs = await getHoursByUserAndDay(userId, dateString);
    if (existingLogs.length > 0) {
      const existingHours = existingLogs.reduce(
        (sum, log) => sum + log.hours,
        0
      );
      return messages.log.duplicateWarning(existingHours, dateDisplay);
    }

    await logHours({
      discordUserId: userId,
      discordUsername: user.registeredName,
      hours,
      date: dateString,
      description: description || undefined,
      logTimestamp: new Date().toISOString(),
    });

    return messages.log.success(hours, dateDisplay, description || undefined);
  } catch (error) {
    console.error("Error in /log command:", error);
    return messages.log.error;
  }
}

async function handleWijzig(
  interaction: APIChatInputApplicationCommandInteraction
): Promise<string> {
  try {
    const userId = getUserId(interaction);
    const user = await getUser(userId);

    if (!user) {
      return messages.wijzig.notRegistered;
    }

    const hours = getNumberOption(interaction, "uren");
    if (hours === null) {
      return messages.wijzig.error;
    }

    const dateInput = getStringOption(interaction, "datum");
    if (!dateInput) {
      return messages.wijzig.error;
    }

    const description = getStringOption(interaction, "omschrijving");

    const parseResult = parseDateStringWithError(dateInput);
    if (!parseResult.success || !parseResult.date) {
      return parseResult.error || messages.wijzig.error;
    }

    const dateString = formatDateToYYYYMMDD(parseResult.date);
    const dateDisplay = formatDateWithDayDutch(parseResult.date);

    const existingLogs = await getHoursByUserAndDay(userId, dateString);
    if (existingLogs.length === 0) {
      return messages.wijzig.noLogsFound(dateDisplay);
    }

    const oldLog = existingLogs[0];

    await updateHoursForDay(
      userId,
      dateString,
      hours,
      description !== null ? description : undefined
    );

    return messages.wijzig.success(
      dateDisplay,
      oldLog.hours,
      hours,
      oldLog.description || undefined,
      description || undefined
    );
  } catch (error) {
    console.error("Error editing hours:", error);
    return messages.wijzig.error;
  }
}

async function handleUren(
  interaction: APIChatInputApplicationCommandInteraction
): Promise<string> {
  try {
    const userId = getUserId(interaction);
    const maandInput = getStringOption(interaction, "maand");

    let startDate: string;
    let endDate: string;
    let periodLabel: string;

    if (maandInput) {
      const parsed = parseMonthString(maandInput);
      if (!parsed) {
        return messages.uren.invalidMonth(maandInput);
      }
      startDate = formatDateToYYYYMMDD(parsed.startDate);
      endDate = formatDateToYYYYMMDD(parsed.endDate);
      periodLabel = parsed.label;
    } else {
      const currentPeriod = getCurrentBillingPeriod();
      startDate = formatDateToYYYYMMDD(currentPeriod.startDate);
      endDate = formatDateToYYYYMMDD(currentPeriod.endDate);
      periodLabel = currentPeriod.label;
    }

    const hours = await getHoursByUser(userId, startDate, endDate);

    if (hours.length === 0) {
      return messages.uren.noHours(periodLabel);
    }

    const totalHours = hours.reduce((sum, entry) => sum + entry.hours, 0);

    let response = messages.uren.header(periodLabel);
    response += messages.uren.total(totalHours);
    response += messages.uren.entries(hours.length);
    response += messages.uren.separator;

    hours.forEach((entry, index) => {
      const dateObj = new Date(entry.date);
      const dateFormatted = format(dateObj, "EEEE d MMMM", { locale: nl });
      response += messages.uren.entry(
        index + 1,
        dateFormatted,
        entry.hours,
        entry.description || undefined
      );
    });

    // Handle long messages: if over limit, split and send extra chunks via follow-up
    if (response.length > DISCORD_MESSAGE_SAFE_LIMIT) {
      const chunks = splitMessage(response, DISCORD_MESSAGE_SAFE_LIMIT);

      // Send additional chunks as follow-up messages
      for (let i = 1; i < chunks.length; i++) {
        await postFollowUp(interaction, chunks[i]);
      }

      // Return the first chunk as the main (PATCH @original) response
      return chunks[0];
    }

    return response;
  } catch (error) {
    console.error("Error fetching hours:", error);
    return messages.uren.error;
  }
}

// ─── Command registry ──────────────────────────────────────────────

/**
 * Registry of command handlers mapped by command name
 */
const commands = new Map<string, CommandHandler>();

commands.set("registreer", handleRegistreer);
commands.set("log", handleLog);
commands.set("wijzig", handleWijzig);
commands.set("verwijder", handleVerwijder);
commands.set("uren", handleUren);
commands.set("email", handleEmail);

// ─── Dispatch infrastructure ───────────────────────────────────────

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
      console.error(
        `Discord follow-up failed (${response.status}): ${errorText}`
      );
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
    // Unknown command -- respond immediately with error
    return Response.json({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: `Onbekend commando: ${commandName}`,
        flags: MessageFlags.Ephemeral,
      },
    });
  }

  // All our commands are chat input (slash) commands — cast is safe
  const chatInteraction = interaction as APIChatInputApplicationCommandInteraction;

  // Fire-and-forget: execute the handler asynchronously and send follow-up
  // Do NOT await -- we need to return the deferred response within 3 seconds
  void (async () => {
    try {
      const message = await handler(chatInteraction);
      await sendFollowUp(interaction, message);
    } catch (error) {
      console.error(`Error executing command "${commandName}":`, error);
      await sendFollowUp(interaction, messages.errors.generic);
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
