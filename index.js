require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const path = require("path");
const cron = require("node-cron");
const { sendWeeklyReport } = require("./utils/emailService");

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Collection to store commands
client.commands = new Collection();

// Load command files
const commandsPath = path.join(__dirname, "commands");
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
      console.log(`✓ Loaded command: ${command.data.name}`);
    } else {
      console.warn(
        `⚠ Command at ${filePath} is missing required "data" or "execute" property.`
      );
    }
  }
}

// Load event handlers
const eventsPath = path.join(__dirname, "events");
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file.endsWith(".js"));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
    console.log(`✓ Loaded event: ${event.name}`);
  }
}

// Schedule weekly reports
const cronSchedule = process.env.CRON_SCHEDULE || "0 18 * * 0"; // Default: Sunday at 18:00
cron.schedule(cronSchedule, async () => {
  console.log("Running scheduled weekly report...");
  try {
    await sendWeeklyReport();
    console.log("✓ Weekly report sent successfully");
  } catch (error) {
    console.error("✗ Error sending weekly report:", error);
  }
});

console.log(`✓ Scheduled weekly reports: ${cronSchedule}`);

// Login to Discord
client.login(process.env.DISCORD_TOKEN);
