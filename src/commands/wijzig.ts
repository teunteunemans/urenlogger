import { SlashCommandBuilder } from "@discordjs/builders";
import { ChatInputCommandInteraction, CacheType } from "discord.js";
import {
  getUser,
  getHoursByUserAndDay,
  updateHoursForDay,
} from "../utils/firebaseService";
import {
  parseDateStringWithError,
  formatDateToYYYYMMDD,
  formatDateWithDayDutch,
} from "../utils/dateParser";
import { messages, commandDescriptions } from "../i18n/nl";

export const data = new SlashCommandBuilder()
  .setName("wijzig")
  .setDescription(commandDescriptions.wijzig.command)
  .addNumberOption((option) =>
    option
      .setName("uren")
      .setDescription(commandDescriptions.wijzig.uren)
      .setRequired(true)
      .setMinValue(0.5)
      .setMaxValue(24)
  )
  .addStringOption((option) =>
    option
      .setName("datum")
      .setDescription(commandDescriptions.wijzig.datum)
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("omschrijving")
      .setDescription(commandDescriptions.wijzig.omschrijving)
      .setRequired(false)
  );

export async function execute(
  interaction: ChatInputCommandInteraction<CacheType>
): Promise<void> {
  const hours = interaction.options.getNumber("uren", true);
  const dateInput = interaction.options.getString("datum", true);
  const description = interaction.options.getString("omschrijving");

  await interaction.deferReply({ ephemeral: true });

  try {
    // Check if user is registered
    const user = await getUser(interaction.user.id);
    if (!user) {
      await interaction.editReply({
        content: messages.wijzig.notRegistered,
      });
      return;
    }

    // Parse the date
    const parseResult = parseDateStringWithError(dateInput);
    if (!parseResult.success || !parseResult.date) {
      await interaction.editReply({
        content: parseResult.error || messages.wijzig.error,
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
        content: messages.wijzig.noLogsFound(dateDisplay),
      });
      return;
    }

    const oldLog = existingLogs[0];

    // Update the hours
    await updateHoursForDay(
      interaction.user.id,
      dateString,
      hours,
      description !== null ? description : undefined
    );

    await interaction.editReply({
      content: messages.wijzig.success(
        dateDisplay,
        oldLog.hours,
        hours,
        oldLog.description || undefined,
        description || undefined
      ),
    });
  } catch (error) {
    console.error("Error editing hours:", error);
    await interaction.editReply({
      content: messages.wijzig.error,
    });
  }
}
