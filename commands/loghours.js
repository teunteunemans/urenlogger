const { SlashCommandBuilder } = require("@discordjs/builders");
const { logHours } = require("../utils/firebaseService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("loghours")
    .setDescription("Log your work hours")
    .addNumberOption((option) =>
      option
        .setName("hours")
        .setDescription("Number of hours worked")
        .setRequired(true)
        .setMinValue(0.1)
        .setMaxValue(24)
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription("Description of work done")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("date")
        .setDescription("Date (YYYY-MM-DD, defaults to today)")
        .setRequired(false)
    ),

  async execute(interaction) {
    const hours = interaction.options.getNumber("hours");
    const description = interaction.options.getString("description");
    const dateString = interaction.options.getString("date");

    try {
      const date = dateString ? new Date(dateString) : new Date();

      // Validate date
      if (isNaN(date.getTime())) {
        return interaction.reply({
          content: "❌ Invalid date format. Please use YYYY-MM-DD.",
          ephemeral: true,
        });
      }

      // Log hours to Firebase
      await logHours({
        userId: interaction.user.id,
        username: interaction.user.username,
        hours,
        description,
        date: date.toISOString(),
        timestamp: new Date().toISOString(),
      });

      await interaction.reply({
        content: `✅ Successfully logged **${hours} hours** on ${date.toLocaleDateString()}!\n📝 ${description}`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error logging hours:", error);
      await interaction.reply({
        content:
          "❌ An error occurred while logging your hours. Please try again.",
        ephemeral: true,
      });
    }
  },
};
