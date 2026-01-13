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
import { validateEnvironment } from "./utils/envValidator";
import { BILLING_PERIOD } from "./config/constants";
import { messages } from "./i18n/nl";

// Import commands
import * as registreerCommand from "./commands/registreer";
import * as logCommand from "./commands/log";
import * as wijzigCommand from "./commands/wijzig";
import * as verwijderCommand from "./commands/verwijder";
import * as emailCommand from "./commands/email";
import * as urenCommand from "./commands/uren";

// Load environment variables
dotenv.config();

// Validate environment variables at startup
validateEnvironment();

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
  intents: [GatewayIntentBits.Guilds],
}) as ExtendedClient;

// Initialize commands collection
client.commands = new Collection();
client.commands.set(registreerCommand.data.name, registreerCommand);
client.commands.set(logCommand.data.name, logCommand);
client.commands.set(wijzigCommand.data.name, wijzigCommand);
client.commands.set(verwijderCommand.data.name, verwijderCommand);
client.commands.set(emailCommand.data.name, emailCommand);
client.commands.set(urenCommand.data.name, urenCommand);

// Ready event
client.once(Events.ClientReady, () => {
  console.log(`Bot ready: ${client.user?.tag}`);
  console.log(`Serving ${client.guilds.cache.size} guild(s)`);
});

// Interaction handler
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  console.log(`Command: /${interaction.commandName} by ${interaction.user.tag}`);

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`Unknown command: /${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error in /${interaction.commandName}:`, error);

    const errorMessage = {
      content: messages.errors.generic,
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
 * Billing period: 22nd of previous month to 21st of current month
 */
async function generateMonthlyReport(): Promise<void> {
  const channelId = process.env.LOG_CHANNEL_ID;

  try {
    const today = new Date();

    // Billing period: 22nd of last month to 21st of this month
    const endDate = new Date(today);
    endDate.setDate(BILLING_PERIOD.END_DAY);

    const startDate = new Date(today);
    startDate.setMonth(startDate.getMonth() - 1);
    startDate.setDate(BILLING_PERIOD.START_DAY);

    const startDateString = formatDateToYYYYMMDD(startDate);
    const endDateString = formatDateToYYYYMMDD(endDate);

    console.log(`Generating monthly report: ${startDateString} to ${endDateString}`);

    await sendMonthlyReport(startDateString, endDateString, startDate, endDate);

    console.log("Monthly report sent successfully");

    // Post success message to Discord
    if (channelId) {
      try {
        const channel = await client.channels.fetch(channelId);
        if (channel && channel.isTextBased()) {
          const message = `Maandrapport voor **${startDateString}** t/m **${endDateString}** succesvol verstuurd naar ${process.env.BOSS_EMAIL}`;
          await (channel as TextChannel).send(message);
        }
      } catch (discordError) {
        console.warn("Could not post to Discord channel");
      }
    }
  } catch (error) {
    console.error("Error generating monthly report:", error);

    // Post failure message to Discord
    if (channelId) {
      try {
        const channel = await client.channels.fetch(channelId);
        if (channel && channel.isTextBased()) {
          const errorMsg =
            error instanceof Error ? error.message : "Onbekende fout";
          const message = `Fout bij het genereren van het maandrapport: ${errorMsg}`;
          await (channel as TextChannel).send(message);
        }
      } catch (discordError) {
        console.warn("Could not post error to Discord channel");
      }
    }
  }
}

// Schedule monthly report: At 00:00 on the 21st day of every month
const cronSchedule = process.env.CRON_SCHEDULE || `0 0 ${BILLING_PERIOD.END_DAY} * *`;
cron.schedule(cronSchedule, () => {
  console.log("Running scheduled task: Monthly report");
  generateMonthlyReport();
});
console.log(`Scheduled: Monthly report (${cronSchedule})`);

// Login to Discord
client.login(process.env.DISCORD_TOKEN);
