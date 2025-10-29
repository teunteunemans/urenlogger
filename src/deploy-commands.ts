import dotenv from "dotenv";
import { REST, Routes } from "discord.js";
import * as registerCommand from "./commands/register";
import * as logCommand from "./commands/log";
import * as editCommand from "./commands/edit";
import * as deleteCommand from "./commands/delete";
import * as debugCommand from "./commands/debug";
import * as myHoursCommand from "./commands/myhours";

// Load environment variables
dotenv.config();

const commands = [
  registerCommand.data.toJSON(),
  logCommand.data.toJSON(),
  editCommand.data.toJSON(),
  deleteCommand.data.toJSON(),
  debugCommand.data.toJSON(),
  myHoursCommand.data.toJSON(),
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);

(async () => {
  try {
    console.log(
      `\nStarted refreshing ${commands.length} application (/) command(s).`
    );

    const data = (await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID!,
        process.env.GUILD_ID!
      ),
      { body: commands }
    )) as any[];

    console.log(
      `✓ Successfully reloaded ${data.length} application (/) command(s).\n`
    );
  } catch (error) {
    console.error("✗ Error deploying commands:", error);
  }
})();
