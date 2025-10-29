import { SlashCommandBuilder } from "@discordjs/builders";
import { ChatInputCommandInteraction, CacheType } from "discord.js";
import { logHours, getUser } from "../utils/firebaseService";
import { parseDateString, formatDateToYYYYMMDD } from "../utils/dateParser";

export const data = new SlashCommandBuilder()
  .setName("log")
  .setDescription("Log your work hours")
  .addNumberOption((option) =>
    option
      .setName("hours")
      .setDescription("Number of hours worked")
      .setRequired(true)
      .setMinValue(0.1)
      .setMaxValue(24)
  )
  .addStringOption((option) =>
    option
      .setName("description")
      .setDescription("What did you work on?")
      .setRequired(false)
  )
  .addStringOption((option) =>
    option
      .setName("date")
      .setDescription(
        'Date (e.g., "yesterday", "22 oct", "2025-10-22", defaults to today)'
      )
      .setRequired(false)
  );

export async function execute(
  interaction: ChatInputCommandInteraction<CacheType>
): Promise<void> {
  // Defer reply to give us time to process
  await interaction.deferReply({ ephemeral: true });

  try {
    // Check if user is registered
    const user = await getUser(interaction.user.id);

    if (!user) {
      await interaction.editReply({
        content: `❌ You need to register first!\n\nPlease use \`/register name: Your Full Name\` to register before logging hours.`,
      });
      return;
    }

    const hours = interaction.options.getNumber("hours", true);
    const description = interaction.options.getString("description");
    const dateInput = interaction.options.getString("date");

    console.log(`   📊 Hours: ${hours}`);
    console.log(`   📝 Description: ${description || "(none)"}`);
    console.log(`   📅 Date input: ${dateInput || "(today)"}`);

    // Parse the date
    console.log("🔄 Parsing date...");
    const date = parseDateString(dateInput || undefined);
    const dateString = formatDateToYYYYMMDD(date);
    console.log(`✅ Parsed date: ${dateString}`);

    // Log to Firestore with registered name
    await logHours({
      discordUserId: interaction.user.id,
      discordUsername: user.registeredName, // Use registered name instead of Discord username
      hours,
      date: dateString,
      description: description || undefined,
      logTimestamp: new Date().toISOString(),
    });

    let response = `✅ Successfully logged **${hours} hours** on **${dateString}**!`;
    if (description) {
      response += `\n📝 ${description}`;
    }

    await interaction.editReply({ content: response });
  } catch (error) {
    console.error("Error in /log command:", error);
    await interaction.editReply({
      content:
        "❌ An error occurred while logging your hours. Please try again.",
    });
  }
}
