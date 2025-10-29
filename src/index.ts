import dotenv from "dotenv";
import {
  Client,
  GatewayIntentBits,
  Collection,
  ChatInputCommandInteraction,
  TextChannel,
  Events,
} from "discord.js";
import cron from "node-cron";
import { sendMonthlyReport } from "./utils/email";
import { formatDateToYYYYMMDD } from "./utils/dateParser";
import * as registerCommand from "./commands/register";
import * as logCommand from "./commands/log";
import * as editCommand from "./commands/edit";
import * as deleteCommand from "./commands/delete";
import * as debugCommand from "./commands/debug";
import * as myHoursCommand from "./commands/myhours";

// Suppress deprecation warnings
process.removeAllListeners("warning");

// Load environment variables
dotenv.config();

// Extend Client type to include commands collection
interface ExtendedClient extends Client {
  commands: Collection<
    string,
    {
      data: any;
      execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
    }
  >;
}

// Create Discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
}) as ExtendedClient;

// Initialize commands collection
client.commands = new Collection();
client.commands.set(registerCommand.data.name, registerCommand);
client.commands.set(logCommand.data.name, logCommand);
client.commands.set(editCommand.data.name, editCommand);
client.commands.set(deleteCommand.data.name, deleteCommand);
client.commands.set(debugCommand.data.name, debugCommand);
client.commands.set(myHoursCommand.data.name, myHoursCommand);

// Ready event (using clientReady to avoid deprecation warning)
client.once(Events.ClientReady, () => {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🤖 DISCORD BOT READY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`👤 Logged in as: ${client.user?.tag}`);
  console.log(`🏰 Serving ${client.guilds.cache.size} guild(s)`);
  console.log(`✅ Bot is online and listening for commands`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
});

// Interaction handler
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("⚡ COMMAND RECEIVED");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📝 Command: /${interaction.commandName}`);
  console.log(`👤 User: ${interaction.user.tag} (${interaction.user.id})`);
  console.log(`🏰 Guild: ${interaction.guild?.name || "DM"}`);

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`❌ No command matching /${interaction.commandName} found`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    return;
  }

  try {
    console.log(`🔄 Executing command...`);
    await command.execute(interaction);
    console.log(`✅ Command executed successfully`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } catch (error) {
    console.error("\n❌ COMMAND EXECUTION FAILED");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error(`Command: /${interaction.commandName}`);
    console.error("Error:", error);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const errorMessage = {
      content: "❌ There was an error while executing this command!",
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
});

/**
 * Generate and send monthly report
 * Billing period: 21st of previous month to 21st of current month
 */
async function generateMonthlyReport(): Promise<void> {
  const channelId = process.env.LOG_CHANNEL_ID;

  try {
    const today = new Date();

    // Billing period: 21st of last month to today (or 21st if today is the 21st)
    const endDate = new Date(today);
    const startDate = new Date(today);
    startDate.setMonth(startDate.getMonth() - 1);
    startDate.setDate(21);

    const startDateString = formatDateToYYYYMMDD(startDate);
    const endDateString = formatDateToYYYYMMDD(endDate);

    console.log(
      `Generating monthly report for ${startDateString} to ${endDateString}`
    );

    // Send the report via email
    await sendMonthlyReport(startDateString, endDateString, startDate, endDate);

    console.log("✓ Monthly report generated and sent successfully");

    // Post success message to Discord
    if (channelId) {
      try {
        const channel = await client.channels.fetch(channelId);
        if (channel && channel.isTextBased()) {
          const message = `✅ Maandrapport voor **${startDateString}** t/m **${endDateString}** succesvol verstuurd naar ${process.env.BOSS_EMAIL}`;
          await (channel as TextChannel).send(message);
        }
      } catch (discordError) {
        console.warn(
          "⚠️  Could not post success message to Discord (missing permissions)"
        );
      }
    }
  } catch (error) {
    console.error("✗ Error generating monthly report:", error);

    // Post failure message to Discord
    if (channelId) {
      try {
        const channel = await client.channels.fetch(channelId);
        if (channel && channel.isTextBased()) {
          const errorMsg =
            error instanceof Error ? error.message : "Unknown error";
          const message = `❌ Fout bij het genereren van het maandrapport: ${errorMsg}`;
          await (channel as TextChannel).send(message);
        }
      } catch (discordError) {
        console.warn(
          "⚠️  Could not post error message to Discord (missing permissions)"
        );
      }
    }
  }
}

// Schedule cron jobs
console.log("Setting up scheduled tasks...");

// Monthly report: At 00:00 on the 21st day of every month
cron.schedule("0 0 21 * *", () => {
  console.log("Running scheduled task: Monthly report");
  generateMonthlyReport();
});
console.log("✓ Scheduled: Monthly report (00:00 on 21st of each month)");

// Login to Discord
client.login(process.env.DISCORD_TOKEN);
