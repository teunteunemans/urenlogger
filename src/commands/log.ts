import { SlashCommandBuilder } from "@discordjs/builders";
import { ChatInputCommandInteraction, CacheType } from "discord.js";
import {
  logHours,
  getUser,
  getHoursByUserAndDay,
} from "../utils/firebaseService";
import {
  parseDateStringWithError,
  formatDateToYYYYMMDD,
  formatDateWithDayDutch,
  validateNotFuture,
} from "../utils/dateParser";
import { messages, commandDescriptions } from "../i18n/nl";

export const data = new SlashCommandBuilder()
  .setName("log")
  .setDescription(commandDescriptions.log.command)
  .addNumberOption((option) =>
    option
      .setName("uren")
      .setDescription(commandDescriptions.log.uren)
      .setRequired(true)
      .setMinValue(0.1)
      .setMaxValue(24)
  )
  .addStringOption((option) =>
    option
      .setName("omschrijving")
      .setDescription(commandDescriptions.log.omschrijving)
      .setRequired(false)
  )
  .addStringOption((option) =>
    option
      .setName("datum")
      .setDescription(commandDescriptions.log.datum)
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
        content: messages.log.notRegistered,
      });
      return;
    }

    const hours = interaction.options.getNumber("uren", true);
    const description = interaction.options.getString("omschrijving");
    const dateInput = interaction.options.getString("datum");

    // Parse the date
    const parseResult = parseDateStringWithError(dateInput || undefined);
    if (!parseResult.success || !parseResult.date) {
      await interaction.editReply({
        content: parseResult.error || messages.log.error,
      });
      return;
    }

    // Validate not a future date
    const futureValidation = validateNotFuture(parseResult.date);
    if (!futureValidation.valid) {
      await interaction.editReply({
        content: messages.log.futureDateError,
      });
      return;
    }

    const dateString = formatDateToYYYYMMDD(parseResult.date);
    const dateDisplay = formatDateWithDayDutch(parseResult.date);

    // Check for duplicate log on same day
    const existingLogs = await getHoursByUserAndDay(
      interaction.user.id,
      dateString
    );

    if (existingLogs.length > 0) {
      const existingHours = existingLogs.reduce((sum, log) => sum + log.hours, 0);
      await interaction.editReply({
        content: messages.log.duplicateWarning(existingHours, dateDisplay),
      });
      return;
    }

    // Log to Firestore with registered name
    await logHours({
      discordUserId: interaction.user.id,
      discordUsername: user.registeredName,
      hours,
      date: dateString,
      description: description || undefined,
      logTimestamp: new Date().toISOString(),
    });

    await interaction.editReply({
      content: messages.log.success(hours, dateDisplay, description || undefined),
    });
  } catch (error) {
    console.error("Error in /log command:", error);
    await interaction.editReply({
      content: messages.log.error,
    });
  }
}
