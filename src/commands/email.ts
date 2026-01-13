import { SlashCommandBuilder } from "@discordjs/builders";
import { ChatInputCommandInteraction, CacheType } from "discord.js";
import {
  getUser,
  updateUserEmail,
  removeUserEmail,
} from "../utils/firebaseService";
import { User } from "../types";
import { messages, commandDescriptions } from "../i18n/nl";

// Better email validation regex
// Checks for: local part @ domain . tld (with tld at least 2 chars)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

export const data = new SlashCommandBuilder()
  .setName("email")
  .setDescription(commandDescriptions.email.command)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("set")
      .setDescription(commandDescriptions.email.set)
      .addStringOption((option) =>
        option
          .setName("address")
          .setDescription(commandDescriptions.email.address)
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("remove").setDescription(commandDescriptions.email.remove)
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("show").setDescription(commandDescriptions.email.show)
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
        content: messages.email.notRegistered,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "set":
        await handleSetEmail(interaction, user);
        break;
      case "remove":
        await handleRemoveEmail(interaction, user);
        break;
      case "show":
        await handleShowEmail(interaction, user);
        break;
      default:
        await interaction.editReply({ content: messages.errors.unknownCommand });
    }
  } catch (error) {
    console.error("Error in /email command:", error);
    await interaction.editReply({
      content: messages.email.error,
    });
  }
}

async function handleSetEmail(
  interaction: ChatInputCommandInteraction<CacheType>,
  user: User
): Promise<void> {
  const email = interaction.options.getString("address", true).trim();

  // Improved email validation
  if (!EMAIL_REGEX.test(email)) {
    await interaction.editReply({
      content: messages.email.invalidFormat,
    });
    return;
  }

  await updateUserEmail(interaction.user.id, email);

  const wasUpdate = !!user.email;
  await interaction.editReply({
    content: messages.email.setSuccess(email, wasUpdate),
  });
}

async function handleRemoveEmail(
  interaction: ChatInputCommandInteraction<CacheType>,
  user: User
): Promise<void> {
  if (!user.email) {
    await interaction.editReply({
      content: messages.email.showNone,
    });
    return;
  }

  const oldEmail = user.email;
  await removeUserEmail(interaction.user.id);

  await interaction.editReply({
    content: messages.email.removeSuccess(oldEmail),
  });
}

async function handleShowEmail(
  interaction: ChatInputCommandInteraction<CacheType>,
  user: User
): Promise<void> {
  if (!user.email) {
    await interaction.editReply({
      content: messages.email.showNone,
    });
    return;
  }

  await interaction.editReply({
    content: messages.email.showCurrent(user.email),
  });
}
