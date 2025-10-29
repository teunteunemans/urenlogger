require("dotenv").config();
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const commands = [];
const commandsPath = path.join(__dirname, "commands");

// Check if commands directory exists
if (!fs.existsSync(commandsPath)) {
  console.error(
    '✗ Commands directory not found. Please create the "commands" folder first.'
  );
  process.exit(1);
}

// Load all command files
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if ("data" in command && "execute" in command) {
    commands.push(command.data.toJSON());
    console.log(`✓ Loaded command: ${command.data.name}`);
  } else {
    console.warn(
      `⚠ Command at ${filePath} is missing required "data" or "execute" property.`
    );
  }
}

// Construct and prepare an instance of the REST module
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

// Deploy commands
(async () => {
  try {
    console.log(
      `\nStarted refreshing ${commands.length} application (/) commands.`
    );

    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log(
      `✓ Successfully reloaded ${data.length} application (/) commands.`
    );
  } catch (error) {
    console.error("✗ Error deploying commands:", error);
  }
})();
