import { SlashCommandBuilder } from "@discordjs/builders";
import { ChatInputCommandInteraction, CacheType } from "discord.js";
import {
  getUser,
  updateUserEmail,
  removeUserEmail,
} from "../utils/firebaseService";

export const data = new SlashCommandBuilder()
  .setName("email")
  .setDescription("Manage your email for receiving monthly report copies")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("set")
      .setDescription("Set or update your email address")
      .addStringOption((option) =>
        option
          .setName("address")
          .setDescription("Your email address")
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("remove").setDescription("Remove your email address")
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("show").setDescription("Show your current email address")
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
          "❌ You must register first using `/register` before you can manage your email.",
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
        await interaction.editReply({ content: "❌ Unknown subcommand" });
    }
  } catch (error) {
    console.error("Error in /email command:", error);
    await interaction.editReply({
      content: "❌ An error occurred while managing your email.",
    });
  }
}

async function handleSetEmail(
  interaction: ChatInputCommandInteraction<CacheType>,
  user: any
): Promise<void> {
  const email = interaction.options.getString("address", true);

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    await interaction.editReply({
      content: "❌ Invalid email address format. Please enter a valid email.",
    });
    return;
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("⚡ COMMAND RECEIVED");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📝 Command: /email set`);
  console.log(`👤 User: ${interaction.user.tag} (${interaction.user.id})`);
  console.log(`📧 Email: ${email}`);

  await updateUserEmail(interaction.user.id, email);

  const wasUpdate = user.email ? true : false;
  await interaction.editReply({
    content: `✅ **Email ${
      wasUpdate ? "updated" : "registered"
    }!**\n\nYou will receive a CC of monthly reports at: **${email}**\n\nYou can update this anytime with \`/email set\` or remove it with \`/email remove\`.`,
  });

  console.log("✅ Command executed successfully");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

async function handleRemoveEmail(
  interaction: ChatInputCommandInteraction<CacheType>,
  user: any
): Promise<void> {
  if (!user.email) {
    await interaction.editReply({
      content:
        "❌ You don't have an email address registered.\n\nUse `/email set` to add one.",
    });
    return;
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("⚡ COMMAND RECEIVED");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📝 Command: /email remove`);
  console.log(`👤 User: ${interaction.user.tag} (${interaction.user.id})`);

  const oldEmail = user.email;
  await removeUserEmail(interaction.user.id);

  await interaction.editReply({
    content: `✅ **Email removed!**\n\nYou will no longer receive copies of monthly reports at **${oldEmail}**.`,
  });

  console.log("✅ Command executed successfully");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

async function handleShowEmail(
  interaction: ChatInputCommandInteraction<CacheType>,
  user: any
): Promise<void> {
  if (!user.email) {
    await interaction.editReply({
      content:
        "📧 **No email registered**\n\nYou are not currently receiving copies of monthly reports.\n\nUse `/email set` to add your email address.",
    });
    return;
  }

  await interaction.editReply({
    content: `📧 **Your registered email:**\n**${user.email}**\n\nYou will receive a CC of monthly reports at this address.\n\nUse \`/email set\` to update or \`/email remove\` to remove it.`,
  });
}
