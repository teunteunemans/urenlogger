import dotenv from "dotenv";
import { REST, Routes } from "discord.js";
import * as registreerCommand from "./commands/registreer";
import * as logCommand from "./commands/log";
import * as wijzigCommand from "./commands/wijzig";
import * as verwijderCommand from "./commands/verwijder";
import * as emailCommand from "./commands/email";
import * as urenCommand from "./commands/uren";

// Load environment variables
dotenv.config();

const commands = [
  registreerCommand.data.toJSON(),
  logCommand.data.toJSON(),
  wijzigCommand.data.toJSON(),
  verwijderCommand.data.toJSON(),
  emailCommand.data.toJSON(),
  urenCommand.data.toJSON(),
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);

(async () => {
  try {
    console.log(`Deploying ${commands.length} commands...`);

    const data = (await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID!,
        process.env.GUILD_ID!
      ),
      { body: commands }
    )) as any[];

    console.log(`Successfully deployed ${data.length} commands.`);

    // List deployed commands
    data.forEach((cmd: any) => {
      console.log(`  - /${cmd.name}`);
    });
  } catch (error) {
    console.error("Error deploying commands:", error);
    process.exit(1);
  }
})();
