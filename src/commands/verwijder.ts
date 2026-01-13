import { SlashCommandBuilder } from "@discordjs/builders";
import { ChatInputCommandInteraction, CacheType } from "discord.js";
import {
  getUser,
  getHoursByUserAndDay,
  deleteHoursForDay,
} from "../utils/firebaseService";
import {
  parseDateStringWithError,
  formatDateToYYYYMMDD,
  formatDateWithDayDutch,
} from "../utils/dateParser";
import { messages, commandDescriptions } from "../i18n/nl";

export const data = new SlashCommandBuilder()
  .setName("verwijder")
  .setDescription(commandDescriptions.verwijder.command)
  .addStringOption((option) =>
    option
      .setName("datum")
      .setDescription(commandDescriptions.verwijder.datum)
      .setRequired(true)
  );

export async function execute(
  interaction: ChatInputCommandInteraction<CacheType>
): Promise<void> {
  const dateInput = interaction.options.getString("datum", true);

  await interaction.deferReply({ ephemeral: true });

  try {
    // Check if user is registered
    const user = await getUser(interaction.user.id);
    if (!user) {
      await interaction.editReply({
        content: messages.verwijder.notRegistered,
      });
      return;
    }

    // Parse the date
    const parseResult = parseDateStringWithError(dateInput);
    if (!parseResult.success || !parseResult.date) {
      await interaction.editReply({
        content: parseResult.error || messages.verwijder.error,
      });
      return;
    }

    const dateString = formatDateToYYYYMMDD(parseResult.date);
    const dateDisplay = formatDateWithDayDutch(parseResult.date);

    // Get existing logs for this day
    const existingLogs = await getHoursByUserAndDay(
      interaction.user.id,
      dateString
    );

    if (existingLogs.length === 0) {
      await interaction.editReply({
        content: messages.verwijder.noLogsFound(dateDisplay),
      });
      return;
    }

    const oldLog = existingLogs[0];

    // Delete the hours
    await deleteHoursForDay(interaction.user.id, dateString);

    await interaction.editReply({
      content: messages.verwijder.success(
        dateDisplay,
        oldLog.hours,
        oldLog.description || undefined
      ),
    });
  } catch (error) {
    console.error("Error deleting hours:", error);
    await interaction.editReply({
      content: messages.verwijder.error,
    });
  }
}
