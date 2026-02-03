/**
 * Dutch translations for all user-facing messages
 */

export const messages = {
  // Registration
  registreer: {
    success: (name: string) =>
      `Je bent geregistreerd als **${name}**!\n\nJe kunt nu \`/log\` gebruiken om je uren te loggen.`,
    updated: (oldName: string, newName: string) =>
      `Je naam is bijgewerkt van **${oldName}** naar **${newName}**!`,
    error: "Er is een fout opgetreden bij het registreren. Probeer het later opnieuw.",
  },

  // Logging hours
  log: {
    notRegistered:
      "Je moet je eerst registreren!\n\nGebruik `/registreer naam: Jouw Volledige Naam` om te registreren.",
    success: (hours: number, dateString: string, description?: string) => {
      let msg = `**${hours} uur** gelogd op **${dateString}**!`;
      if (description) {
        msg += `\n${description}`;
      }
      return msg;
    },
    duplicateWarning: (existingHours: number, dateString: string) =>
      `Je hebt al **${existingHours} uur** gelogd op **${dateString}**.\n\nGebruik \`/wijzig\` om je uren aan te passen of \`/verwijder\` om ze te verwijderen.`,
    error: "Er is een fout opgetreden bij het loggen van je uren. Probeer het opnieuw.",
    futureDateError: "Je kunt geen uren loggen voor een datum in de toekomst.",
    invalidDate: (input: string) =>
      `Ongeldige datum: "${input}". Gebruik formaten zoals "vandaag", "gisteren", "22 okt", of "2025-10-22".`,
  },

  // View hours (/uren)
  uren: {
    noHours: (period: string) => `Geen uren gelogd voor **${period}**.`,
    header: (period: string) => `**Jouw Gelogde Uren** (${period})\n\n`,
    total: (hours: number) => `**Totaal: ${hours.toFixed(2)} uur**\n`,
    entries: (count: number) => `**Aantal: ${count}**\n\n`,
    separator: "─────────────────────────────\n\n",
    entry: (index: number, date: string, hours: number, description?: string) => {
      let entry = `**${index}.** ${date} - **${hours}u**\n`;
      if (description) {
        entry += `   ${description}\n`;
      }
      return entry + "\n";
    },
    error: "Er is een fout opgetreden bij het ophalen van je uren. Probeer het opnieuw.",
    invalidMonth: (input: string) =>
      `Ongeldige maand: "${input}". Gebruik formaten zoals "feb 2024" of "maart 2025".`,
  },

  // Edit hours (/wijzig)
  wijzig: {
    notRegistered:
      "Je moet je eerst registreren met `/registreer` voordat je uren kunt wijzigen.",
    noLogsFound: (date: string) =>
      `Geen uren gevonden voor ${date}.\n\nGebruik \`/log\` om eerst uren toe te voegen.`,
    success: (
      date: string,
      oldHours: number,
      newHours: number,
      oldDesc?: string,
      newDesc?: string
    ) => {
      let msg = `**Uren bijgewerkt voor ${date}**\n\n`;
      msg += `**Oud:** ${oldHours}u`;
      if (oldDesc) msg += ` - ${oldDesc}`;
      msg += `\n**Nieuw:** ${newHours}u`;
      if (newDesc) msg += ` - ${newDesc}`;
      return msg;
    },
    error: "Er is een fout opgetreden bij het wijzigen van de uren. Probeer het opnieuw.",
  },

  // Delete hours (/verwijder)
  verwijder: {
    notRegistered:
      "Je moet je eerst registreren met `/registreer` voordat je uren kunt verwijderen.",
    noLogsFound: (date: string) =>
      `Geen uren gevonden voor ${date}.\n\nEr valt niets te verwijderen.`,
    success: (date: string, hours: number, description?: string) => {
      let msg = `**Uren verwijderd voor ${date}**\n\n`;
      msg += `**Verwijderd:** ${hours}u`;
      if (description) msg += ` - ${description}`;
      return msg;
    },
    error: "Er is een fout opgetreden bij het verwijderen van de uren. Probeer het opnieuw.",
  },

  // Email management
  email: {
    notRegistered:
      "Je moet je eerst registreren met `/registreer` voordat je je e-mail kunt beheren.",
    invalidFormat: "Ongeldig e-mailadres. Voer een geldig e-mailadres in.",
    setSuccess: (email: string, isUpdate: boolean) =>
      `**E-mail ${isUpdate ? "bijgewerkt" : "ingesteld"}!**\n\nJe ontvangt een kopie van maandelijkse rapporten op: **${email}**\n\nJe kunt dit aanpassen met \`/email set\` of verwijderen met \`/email remove\`.`,
    removeSuccess: (email: string) =>
      `**E-mail verwijderd!**\n\nJe ontvangt geen kopie meer van maandelijkse rapporten op **${email}**.`,
    showCurrent: (email: string) =>
      `**Je geregistreerde e-mail:**\n**${email}**\n\nJe ontvangt een kopie van maandelijkse rapporten op dit adres.\n\nGebruik \`/email set\` om te wijzigen of \`/email remove\` om te verwijderen.`,
    showNone:
      "**Geen e-mail geregistreerd**\n\nJe ontvangt momenteel geen kopie van maandelijkse rapporten.\n\nGebruik `/email set` om je e-mailadres toe te voegen.",
    error: "Er is een fout opgetreden bij het beheren van je e-mail.",
  },

  // General errors
  errors: {
    generic: "Er is een fout opgetreden bij het uitvoeren van dit commando!",
    unknownCommand: "Onbekend commando.",
  },
};

/**
 * Command descriptions for slash command builder
 */
export const commandDescriptions = {
  registreer: {
    command: "Registreer of wijzig je naam voor het loggen van werkuren",
    naam: "Je volledige naam (zoals deze in rapporten moet verschijnen)",
  },
  log: {
    command: "Log je werkuren",
    uren: "Aantal gewerkte uren",
    omschrijving: "Waar heb je aan gewerkt?",
    datum: 'Datum (bijv. "vandaag", "gisteren", "22 okt", standaard: vandaag)',
  },
  uren: {
    command: "Bekijk je gelogde uren",
    maand: 'Maand om te bekijken (bijv. "feb 2024", "maart 2025")',
  },
  wijzig: {
    command: "Wijzig je gelogde uren voor een specifieke dag",
    uren: "Nieuw aantal uren",
    datum: 'Datum om te wijzigen (bijv. "vandaag", "gisteren", "15 okt")',
    omschrijving: "Nieuwe omschrijving (optioneel)",
  },
  verwijder: {
    command: "Verwijder je gelogde uren voor een specifieke dag",
    datum: 'Datum om te verwijderen (bijv. "vandaag", "gisteren", "15 okt")',
  },
  email: {
    command: "Beheer je e-mail voor het ontvangen van maandrapport kopies",
    set: "Stel je e-mailadres in of wijzig het",
    address: "Je e-mailadres",
    remove: "Verwijder je e-mailadres",
    show: "Toon je huidige e-mailadres",
  },
};
