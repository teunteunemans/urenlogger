/**
 * Deploy slash commands to Discord via REST API.
 *
 * Usage: npx tsx scripts/deploy-commands.ts
 *
 * Registers all 6 guild commands using Discord's bulk overwrite endpoint.
 * Uses native fetch (Node.js 18+) — no discord.js dependency needed.
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local from the next/ directory
config({ path: resolve(__dirname, "../.env.local") });

// Discord API option types
const STRING = 3;
const NUMBER = 10;
const SUB_COMMAND = 1;

// Command definitions (Discord API JSON format)
const commands = [
  {
    name: "registreer",
    description: "Registreer of wijzig je naam voor het loggen van werkuren",
    options: [
      {
        name: "naam",
        description:
          "Je volledige naam (zoals deze in rapporten moet verschijnen)",
        type: STRING,
        required: true,
      },
    ],
  },
  {
    name: "log",
    description: "Log je werkuren",
    options: [
      {
        name: "uren",
        description: "Aantal gewerkte uren",
        type: NUMBER,
        required: true,
        min_value: 0.1,
        max_value: 24,
      },
      {
        name: "omschrijving",
        description: "Waar heb je aan gewerkt?",
        type: STRING,
        required: false,
      },
      {
        name: "datum",
        description:
          'Datum (bijv. "vandaag", "gisteren", "22 okt", standaard: vandaag)',
        type: STRING,
        required: false,
      },
    ],
  },
  {
    name: "wijzig",
    description: "Wijzig je gelogde uren voor een specifieke dag",
    options: [
      {
        name: "uren",
        description: "Nieuw aantal uren",
        type: NUMBER,
        required: true,
        min_value: 0.5,
        max_value: 24,
      },
      {
        name: "datum",
        description:
          'Datum om te wijzigen (bijv. "vandaag", "gisteren", "15 okt")',
        type: STRING,
        required: true,
      },
      {
        name: "omschrijving",
        description: "Nieuwe omschrijving (optioneel)",
        type: STRING,
        required: false,
      },
    ],
  },
  {
    name: "verwijder",
    description: "Verwijder je gelogde uren voor een specifieke dag",
    options: [
      {
        name: "datum",
        description:
          'Datum om te verwijderen (bijv. "vandaag", "gisteren", "15 okt")',
        type: STRING,
        required: true,
      },
    ],
  },
  {
    name: "uren",
    description: "Bekijk je gelogde uren",
    options: [
      {
        name: "maand",
        description: 'Maand om te bekijken (bijv. "feb 2024", "maart 2025")',
        type: STRING,
        required: false,
      },
    ],
  },
  {
    name: "email",
    description:
      "Beheer je e-mail voor het ontvangen van maandrapport kopies",
    options: [
      {
        name: "instellen",
        description: "Stel je e-mailadres in of wijzig het",
        type: SUB_COMMAND,
        options: [
          {
            name: "adres",
            description: "Je e-mailadres",
            type: STRING,
            required: true,
          },
        ],
      },
      {
        name: "verwijderen",
        description: "Verwijder je e-mailadres",
        type: SUB_COMMAND,
      },
      {
        name: "tonen",
        description: "Toon je huidige e-mailadres",
        type: SUB_COMMAND,
      },
    ],
  },
];

async function main(): Promise<void> {
  const applicationId = process.env.DISCORD_APPLICATION_ID;
  const guildId = process.env.GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!applicationId || !guildId || !botToken) {
    console.error(
      "Missing required env vars: DISCORD_APPLICATION_ID, GUILD_ID, DISCORD_BOT_TOKEN"
    );
    console.error("Make sure .env.local exists in the next/ directory.");
    process.exit(1);
  }

  const url = `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`;

  console.log(`Deploying ${commands.length} commands...`);

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${botToken}`,
    },
    body: JSON.stringify(commands),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Discord API error (${response.status}): ${errorText}`);
    process.exit(1);
  }

  const data = (await response.json()) as Array<{ name: string }>;

  console.log(`Successfully deployed ${data.length} commands:`);
  data.forEach((cmd) => {
    console.log(`  - /${cmd.name}`);
  });
}

main().catch((error) => {
  console.error("Error deploying commands:", error);
  process.exit(1);
});
