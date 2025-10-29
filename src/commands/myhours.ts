import { SlashCommandBuilder } from "@discordjs/builders";
import { ChatInputCommandInteraction, CacheType } from "discord.js";
import { getHoursByUser } from "../utils/firebaseService";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { formatDateToYYYYMMDD } from "../utils/dateParser";

export const data = new SlashCommandBuilder()
  .setName("myhours")
  .setDescription("View your logged hours")
  .addStringOption((option) =>
    option
      .setName("period")
      .setDescription("Time period to view")
      .setRequired(false)
      .addChoices(
        { name: "This Week", value: "week" },
        { name: "This Month", value: "month" },
        { name: "All Time", value: "all" }
      )
  );

export async function execute(
  interaction: ChatInputCommandInteraction<CacheType>
): Promise<void> {
  const period = interaction.options.getString("period") || "week";

  await interaction.deferReply({ ephemeral: true });

  try {
    const userId = interaction.user.id;
    let startDate: string | undefined;
    let endDate: string | undefined;
    let periodLabel: string;

    const now = new Date();

    switch (period) {
      case "week":
        startDate = formatDateToYYYYMMDD(startOfWeek(now, { weekStartsOn: 1 }));
        endDate = formatDateToYYYYMMDD(endOfWeek(now, { weekStartsOn: 1 }));
        periodLabel = "This Week";
        break;
      case "month":
        startDate = formatDateToYYYYMMDD(startOfMonth(now));
        endDate = formatDateToYYYYMMDD(endOfMonth(now));
        periodLabel = "This Month";
        break;
      case "all":
        startDate = undefined;
        endDate = undefined;
        periodLabel = "All Time";
        break;
      default:
        startDate = formatDateToYYYYMMDD(startOfWeek(now, { weekStartsOn: 1 }));
        endDate = formatDateToYYYYMMDD(endOfWeek(now, { weekStartsOn: 1 }));
        periodLabel = "This Week";
    }

    const hours = await getHoursByUser(userId, startDate, endDate);

    if (hours.length === 0) {
      await interaction.editReply({
        content: `📊 No hours logged for **${periodLabel}**.`,
      });
      return;
    }

    const totalHours = hours.reduce((sum, entry) => sum + entry.hours, 0);

    let response = `📊 **Your Logged Hours** (${periodLabel})\n\n`;
    response += `**Total: ${totalHours.toFixed(2)} hours**\n`;
    response += `**Entries: ${hours.length}**\n\n`;
    response += "─────────────────────────────\n\n";

    hours.forEach((entry, index) => {
      const date = format(new Date(entry.date), "yyyy-MM-dd (EEE)");
      response += `**${index + 1}.** ${date} - **${entry.hours}h**\n`;
      if (entry.description) {
        response += `   📝 ${entry.description}\n`;
      }
      response += "\n";
    });

    // Split into multiple messages if too long (Discord limit is 2000 characters)
    if (response.length > 1900) {
      const chunks = splitMessage(response, 1900);
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
      content:
        "❌ An error occurred while fetching your hours. Please try again.",
    });
  }
}

function splitMessage(message: string, maxLength: number): string[] {
  const chunks: string[] = [];
  const lines = message.split("\n");
  let currentChunk = "";

  for (const line of lines) {
    if (currentChunk.length + line.length + 1 > maxLength) {
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
