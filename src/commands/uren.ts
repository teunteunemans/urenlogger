import { SlashCommandBuilder } from "@discordjs/builders";
import { ChatInputCommandInteraction, CacheType } from "discord.js";
import { getHoursByUser } from "../utils/firebaseService";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  formatDateToYYYYMMDD,
  getCurrentBillingPeriod,
  parseMonthString,
} from "../utils/dateParser";
import { messages, commandDescriptions } from "../i18n/nl";
import { DISCORD_MESSAGE_SAFE_LIMIT } from "../config/constants";

export const data = new SlashCommandBuilder()
  .setName("uren")
  .setDescription(commandDescriptions.uren.command)
  .addStringOption((option) =>
    option
      .setName("maand")
      .setDescription(commandDescriptions.uren.maand)
      .setRequired(false)
  );

export async function execute(
  interaction: ChatInputCommandInteraction<CacheType>
): Promise<void> {
  const maandInput = interaction.options.getString("maand");

  await interaction.deferReply({ ephemeral: true });

  try {
    const userId = interaction.user.id;
    let startDate: string;
    let endDate: string;
    let periodLabel: string;

    if (maandInput) {
      // Parse specific month like "feb 2024", "maart 2025"
      const parsed = parseMonthString(maandInput);
      if (!parsed) {
        await interaction.editReply({
          content: messages.uren.invalidMonth(maandInput),
        });
        return;
      }
      startDate = formatDateToYYYYMMDD(parsed.startDate);
      endDate = formatDateToYYYYMMDD(parsed.endDate);
      periodLabel = parsed.label;
    } else {
      // Default: current billing period
      const currentPeriod = getCurrentBillingPeriod();
      startDate = formatDateToYYYYMMDD(currentPeriod.startDate);
      endDate = formatDateToYYYYMMDD(currentPeriod.endDate);
      periodLabel = currentPeriod.label;
    }

    const hours = await getHoursByUser(userId, startDate, endDate);

    if (hours.length === 0) {
      await interaction.editReply({
        content: messages.uren.noHours(periodLabel),
      });
      return;
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

    // Split into multiple messages if too long
    if (response.length > DISCORD_MESSAGE_SAFE_LIMIT) {
      const chunks = splitMessage(response, DISCORD_MESSAGE_SAFE_LIMIT);
      for (let i = 0; i < chunks.length; i++) {
        if (i === 0) {
          await interaction.editReply({ content: chunks[i] });
        } else {
          await interaction.followUp({ content: chunks[i], ephemeral: true });
        }
      }
    } else {
      await interaction.editReply({ content: response });
    }
  } catch (error) {
    console.error("Error fetching hours:", error);
    await interaction.editReply({
      content: messages.uren.error,
    });
  }
}

function splitMessage(message: string, maxLength: number): string[] {
  const chunks: string[] = [];
  const lines = message.split("\n");
  let currentChunk = "";

  for (const line of lines) {
    // If a single line is too long, split it
    if (line.length > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = "";
      }
      // Split long line into chunks
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
