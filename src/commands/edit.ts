import { SlashCommandBuilder } from "@discordjs/builders";
import { ChatInputCommandInteraction, CacheType } from "discord.js";
import {
  getUser,
  getHoursByUserAndDay,
  updateHoursForDay,
} from "../utils/firebaseService";
import { parseDateString } from "../utils/dateParser";
import { format } from "date-fns";

export const data = new SlashCommandBuilder()
  .setName("edit")
  .setDescription("Edit your logged hours for a specific day")
  .addNumberOption((option) =>
    option
      .setName("hours")
      .setDescription("New number of hours worked")
      .setRequired(true)
      .setMinValue(0.5)
      .setMaxValue(24)
  )
  .addStringOption((option) =>
    option
      .setName("date")
      .setDescription(
        'Date to edit (e.g., "today", "yesterday", "2025-10-15", or "15 Oct")'
      )
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("description")
      .setDescription("New work description (optional)")
      .setRequired(false)
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
          "❌ You must register first using `/register` before you can edit hours.",
      });
      return;
    }

    const hours = interaction.options.getNumber("hours", true);
    const dateInput = interaction.options.getString("date", true);
    const description = interaction.options.getString("description");

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("⚡ COMMAND RECEIVED");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📝 Command: /edit`);
    console.log(`👤 User: ${interaction.user.tag} (${interaction.user.id})`);
    console.log(`🏰 Guild: ${interaction.guild?.name}`);
    console.log(`🔄 Executing command...`);
    console.log(`   📊 New Hours: ${hours}`);
    console.log(`   📝 New Description: ${description || "(unchanged)"}`);
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
        )}.\n\nUse \`/log\` to add hours for this date first.`,
      });
      console.log("❌ No logs found to edit");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      return;
    }

    // Update the hours
    const updateCount = await updateHoursForDay(
      interaction.user.id,
      dateString,
      hours,
      description || undefined
    );

    const oldLog = existingLogs[0];
    let replyMessage = `✅ **Successfully updated hours for ${format(
      parsedDate,
      "dd MMMM yyyy"
    )}**\n\n`;
    replyMessage += `**Old:** ${oldLog.hours}h - ${
      oldLog.description || "(no description)"
    }\n`;
    replyMessage += `**New:** ${hours}h - ${
      description !== undefined
        ? description || "(no description)"
        : oldLog.description || "(no description)"
    }`;

    await interaction.editReply({
      content: replyMessage,
    });

    console.log("✅ Command executed successfully");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } catch (error) {
    console.error("Error in /edit command:", error);
    await interaction.editReply({
      content: "❌ An error occurred while editing hours. Please try again.",
    });
    console.log("❌ Command failed");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  }
}
