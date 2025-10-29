import { SlashCommandBuilder } from "@discordjs/builders";
import { ChatInputCommandInteraction, CacheType } from "discord.js";
import {
  getUser,
  getHoursByUserAndDay,
  deleteHoursForDay,
} from "../utils/firebaseService";
import { parseDateString } from "../utils/dateParser";
import { format } from "date-fns";

export const data = new SlashCommandBuilder()
  .setName("delete")
  .setDescription("Delete your logged hours for a specific day")
  .addStringOption((option) =>
    option
      .setName("date")
      .setDescription(
        'Date to delete (e.g., "today", "yesterday", "2025-10-15", or "15 Oct")'
      )
      .setRequired(true)
  );

export async function execute(
  interaction: ChatInputCommandInteraction<CacheType>
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  try {
    // Check if user is registered
    const user = await getUser(interaction.user.id);
    if (!user) {
      await interaction.editReply({
        content:
          "❌ You must register first using `/register` before you can delete hours.",
      });
      return;
    }

    const dateInput = interaction.options.getString("date", true);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("⚡ COMMAND RECEIVED");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📝 Command: /delete`);
    console.log(`👤 User: ${interaction.user.tag} (${interaction.user.id})`);
    console.log(`🏰 Guild: ${interaction.guild?.name}`);
    console.log(`🔄 Executing command...`);
    console.log(`   📅 Date input: ${dateInput}`);

    // Parse the date
    console.log(`🔄 Parsing date...`);
    const parsedDate = parseDateString(dateInput);
    const dateString = format(parsedDate, "yyyy-MM-dd");
    console.log(`✅ Parsed date: ${dateString}`);

    // Check if logs exist for this date
    const existingLogs = await getHoursByUserAndDay(
      interaction.user.id,
      dateString
    );

    if (existingLogs.length === 0) {
      await interaction.editReply({
        content: `❌ No hours logged for ${format(
          parsedDate,
          "dd MMMM yyyy"
        )}.\n\nNothing to delete.`,
      });
      console.log("❌ No logs found to delete");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      return;
    }

    // Show what will be deleted
    const oldLog = existingLogs[0];
    const deleteCount = await deleteHoursForDay(
      interaction.user.id,
      dateString
    );

    await interaction.editReply({
      content: `✅ **Successfully deleted hours for ${format(
        parsedDate,
        "dd MMMM yyyy"
      )}**\n\n**Deleted:** ${oldLog.hours}h - ${
        oldLog.description || "(no description)"
      }`,
    });

    console.log("✅ Command executed successfully");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } catch (error) {
    console.error("Error in /delete command:", error);
    await interaction.editReply({
      content: "❌ An error occurred while deleting hours. Please try again.",
    });
    console.log("❌ Command failed");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  }
}
