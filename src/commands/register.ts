import { SlashCommandBuilder } from "@discordjs/builders";
import { ChatInputCommandInteraction, CacheType } from "discord.js";
import { registerUser, getUser } from "../utils/firebaseService";

export const data = new SlashCommandBuilder()
  .setName("register")
  .setDescription("Register your name for work hour logging")
  .addStringOption((option) =>
    option
      .setName("name")
      .setDescription("Your full name (as it should appear in reports)")
      .setRequired(true)
  );

export async function execute(
  interaction: ChatInputCommandInteraction<CacheType>
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  try {
    const name = interaction.options.getString("name", true);

    // Check if user is already registered
    const existingUser = await getUser(interaction.user.id);

    if (existingUser) {
      await interaction.editReply({
        content: `⚠️ You are already registered as **${existingUser.registeredName}**.\n\nIf you want to change your name, please contact an administrator.`,
      });
      return;
    }

    // Register the user
    await registerUser(interaction.user.id, name);

    await interaction.editReply({
      content: `✅ Successfully registered as **${name}**!\n\nYou can now use \`/log\` to log your work hours.`,
    });
  } catch (error) {
    console.error("Error in /register command:", error);
    await interaction.editReply({
      content:
        "❌ An error occurred while registering. Please try again later.",
    });
  }
}
