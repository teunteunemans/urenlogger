import { SlashCommandBuilder } from "@discordjs/builders";
import { ChatInputCommandInteraction, CacheType } from "discord.js";
import {
  registerUser,
  getUser,
  updateUserName,
} from "../utils/firebaseService";
import { messages, commandDescriptions } from "../i18n/nl";

export const data = new SlashCommandBuilder()
  .setName("registreer")
  .setDescription(commandDescriptions.registreer.command)
  .addStringOption((option) =>
    option
      .setName("naam")
      .setDescription(commandDescriptions.registreer.naam)
      .setRequired(true)
  );

export async function execute(
  interaction: ChatInputCommandInteraction<CacheType>
): Promise<void> {
  const name = interaction.options.getString("naam", true);

  await interaction.deferReply({ ephemeral: true });

  try {
    // Check if user is already registered
    const existingUser = await getUser(interaction.user.id);

    if (existingUser) {
      // Update existing user's name
      await updateUserName(interaction.user.id, name);
      await interaction.editReply({
        content: messages.registreer.updated(existingUser.registeredName, name),
      });
      return;
    }

    // Register new user
    await registerUser(interaction.user.id, name);
    await interaction.editReply({
      content: messages.registreer.success(name),
    });
  } catch (error) {
    console.error("Error registering user:", error);
    await interaction.editReply({
      content: messages.registreer.error,
    });
  }
}
