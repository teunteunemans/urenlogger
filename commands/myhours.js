const { SlashCommandBuilder } = require("@discordjs/builders");
const { getHoursByUser } = require("../utils/firebaseService");
const { format, startOfWeek, endOfWeek } = require("date-fns");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("myhours")
    .setDescription("View your logged hours")
    .addStringOption((option) =>
      option
        .setName("period")
        .setDescription("Time period to view")
        .setRequired(false)
        .addChoices(
          { name: "This Week", value: "week" },
          { name: "All Time", value: "all" }
        )
    ),

  async execute(interaction) {
    const period = interaction.options.getString("period") || "week";

    try {
      await interaction.deferReply({ ephemeral: true });

      const userId = interaction.user.id;
      let startDate, endDate;

      if (period === "week") {
        startDate = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
        endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
      } else {
        startDate = null;
        endDate = null;
      }

      const hours = await getHoursByUser(userId, startDate, endDate);

      if (hours.length === 0) {
        return interaction.editReply({
          content: `📊 No hours logged ${
            period === "week" ? "this week" : "yet"
          }.`,
        });
      }

      const totalHours = hours.reduce((sum, entry) => sum + entry.hours, 0);

      let response = `📊 **Your Logged Hours** (${
        period === "week" ? "This Week" : "All Time"
      })\n\n`;
      response += `**Total: ${totalHours.toFixed(2)} hours**\n\n`;

      hours.forEach((entry) => {
        const date = new Date(entry.date);
        response += `📅 ${format(date, "yyyy-MM-dd")} - **${entry.hours}h**\n`;
        response += `   📝 ${entry.description}\n\n`;
      });

      await interaction.editReply({ content: response });
    } catch (error) {
      console.error("Error fetching hours:", error);
      await interaction.editReply({
        content:
          "❌ An error occurred while fetching your hours. Please try again.",
      });
    }
  },
};
