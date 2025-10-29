import { SlashCommandBuilder } from "@discordjs/builders";
import {
  ChatInputCommandInteraction,
  CacheType,
  TextChannel,
} from "discord.js";
import { format } from "date-fns";
import { sendMonthlyReport, sendTestEmail } from "../utils/email";
import { formatDateToYYYYMMDD } from "../utils/dateParser";
import {
  logHours,
  getHoursByDateRange,
  deleteTestLogs,
} from "../utils/firebaseService";

export const data = new SlashCommandBuilder()
  .setName("debug")
  .setDescription("Admin debug commands (requires debug key)")
  .addStringOption((option) =>
    option.setName("key").setDescription("Debug key").setRequired(true)
  )
  .addIntegerOption((option) =>
    option
      .setName("test")
      .setDescription("Test type: 1=Full Test, 2=Email, 3=Header, 4=Report, 5=Status")
      .setRequired(true)
      .addChoices(
        { name: "1 - Full System Test", value: 1 },
        { name: "2 - Test Email", value: 2 },
        { name: "3 - Monthly Header", value: 3 },
        { name: "4 - Monthly Report", value: 4 },
        { name: "5 - Status Check", value: 5 }
      )
  )
  .addStringOption((option) =>
    option
      .setName("email")
      .setDescription("Debug email address (for tests 1, 2, 4)")
      .setRequired(false)
  )
  .addStringOption((option) =>
    option
      .setName("start-date")
      .setDescription("Start date for test 4 (YYYY-MM-DD)")
      .setRequired(false)
  )
  .addStringOption((option) =>
    option
      .setName("end-date")
      .setDescription("End date for test 4 (YYYY-MM-DD)")
      .setRequired(false)
  );

export async function execute(
  interaction: ChatInputCommandInteraction<CacheType>
): Promise<void> {
  const key = interaction.options.getString("key", true);
  const testType = interaction.options.getInteger("test", true);

  await interaction.deferReply({ ephemeral: true });

  // Verify debug key
  const debugKey = process.env.DEBUG_KEY;
  if (!debugKey || key !== debugKey) {
    await interaction.editReply({
      content: "❌ Invalid debug key. Access denied.",
    });
    return;
  }

  try {
    switch (testType) {
      case 1:
        await handleFullTest(interaction);
        break;
      case 2:
        await handleTestEmail(interaction);
        break;
      case 3:
        await handleMonthlyHeader(interaction);
        break;
      case 4:
        await handleMonthlyReport(interaction);
        break;
      case 5:
        await handleStatus(interaction);
        break;
      default:
        await interaction.editReply({ content: "❌ Invalid test type" });
    }
  } catch (error) {
    console.error("Error in /debug command:", error);
    await interaction.editReply({
      content: `❌ An error occurred: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    });
  }
}

async function handleFullTest(
  interaction: ChatInputCommandInteraction<CacheType>
): Promise<void> {
  const debugEmail =
    interaction.options.getString("email") ||
    process.env.YOUR_EMAIL_ADDRESS ||
    "";

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🧪 FULL SYSTEM TEST STARTED");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📧 Debug Email: ${debugEmail}`);
  console.log(`👤 Test User: ${interaction.user.tag}`);

  const testResults: string[] = [];
  let allPassed = true;

  await interaction.editReply({
    content: "🧪 **Running Full System Test**\n\n⏳ Starting tests...",
  });

  // Test 1: Configuration Check
  try {
    await interaction.editReply({
      content:
        "🧪 **Running Full System Test**\n\n✅ Test 1/6: Configuration check\n⏳ Test 2/6: Firebase connection...",
    });
    console.log("\n📋 Test 1/6: Configuration Check");

    const requiredEnvVars = [
      "DISCORD_TOKEN",
      "CLIENT_ID",
      "GUILD_ID",
      "LOG_CHANNEL_ID",
      "GOOGLE_APPLICATION_CREDENTIALS",
      "SMTP_HOST",
      "SMTP_PORT",
      "SMTP_USER",
      "SMTP_PASS",
      "YOUR_EMAIL_ADDRESS",
    ];

    const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

    if (missingVars.length > 0) {
      throw new Error(`Missing env vars: ${missingVars.join(", ")}`);
    }

    console.log("✅ All environment variables configured");
    testResults.push("✅ Configuration");
  } catch (error) {
    console.error("❌ Configuration check failed:", error);
    testResults.push(`❌ Configuration: ${error}`);
    allPassed = false;
  }

  // Test 2: Firebase Connection & Write
  try {
    await interaction.editReply({
      content:
        "🧪 **Running Full System Test**\n\n✅ Test 1/6: Configuration\n✅ Test 2/6: Firebase connection\n⏳ Test 3/6: Data write...",
    });
    console.log("\n📋 Test 2/6: Firebase Connection & Write");

    const testData = {
      discordUserId: interaction.user.id,
      discordUsername: `${interaction.user.username}_TEST`,
      hours: 1.5,
      date: formatDateToYYYYMMDD(new Date()),
      description: "🧪 SYSTEM TEST - Safe to delete",
      logTimestamp: new Date().toISOString(),
    };

    const docId = await logHours(testData);
    console.log(`✅ Test data logged with ID: ${docId}`);
    testResults.push(`✅ Firebase Write (Doc: ${docId.substring(0, 8)}...)`);
  } catch (error) {
    console.error("❌ Firebase write failed:", error);
    testResults.push(`❌ Firebase Write: ${error}`);
    allPassed = false;
  }

  // Test 3: Firebase Read
  try {
    await interaction.editReply({
      content:
        "🧪 **Running Full System Test**\n\n✅ Test 1/6: Configuration\n✅ Test 2/6: Firebase write\n✅ Test 3/6: Data read\n⏳ Test 4/6: Discord channel...",
    });
    console.log("\n📋 Test 3/6: Firebase Read");

    const today = formatDateToYYYYMMDD(new Date());
    const logs = await getHoursByDateRange(today, today);

    console.log(`✅ Read ${logs.length} log(s) for today`);
    testResults.push(`✅ Firebase Read (${logs.length} records today)`);
  } catch (error) {
    console.error("❌ Firebase read failed:", error);
    testResults.push(`❌ Firebase Read: ${error}`);
    allPassed = false;
  }

  // Test 4: Discord Channel Access
  try {
    await interaction.editReply({
      content:
        "🧪 **Running Full System Test**\n\n✅ Test 1/6: Configuration\n✅ Test 2/6: Firebase write\n✅ Test 3/6: Firebase read\n✅ Test 4/6: Discord channel\n⏳ Test 5/6: Email sending...",
    });
    console.log("\n📋 Test 4/6: Discord Channel Access");

    const channelId = process.env.LOG_CHANNEL_ID;
    if (!channelId) {
      throw new Error("LOG_CHANNEL_ID not set");
    }

    const channel = await interaction.client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) {
      throw new Error("Channel not found or not text-based");
    }

    console.log(`✅ Channel accessible: #${(channel as TextChannel).name}`);
    testResults.push(`✅ Discord Channel (#${(channel as TextChannel).name})`);
  } catch (error) {
    console.error("❌ Discord channel access failed:", error);
    testResults.push(`❌ Discord Channel: ${error}`);
    allPassed = false;
  }

  // Test 5: Email Sending
  try {
    await interaction.editReply({
      content:
        "🧪 **Running Full System Test**\n\n✅ Test 1/6: Configuration\n✅ Test 2/6: Firebase write\n✅ Test 3/6: Firebase read\n✅ Test 4/6: Discord channel\n✅ Test 5/6: Email\n⏳ Test 6/6: Monthly report...",
    });
    console.log("\n📋 Test 5/6: Email Sending");

    const originalBossEmail = process.env.BOSS_EMAIL;
    process.env.BOSS_EMAIL = debugEmail;

    try {
      await sendTestEmail();
      console.log(`✅ Test email sent to ${debugEmail}`);
      testResults.push(`✅ Email (sent to ${debugEmail})`);
    } finally {
      process.env.BOSS_EMAIL = originalBossEmail;
    }
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    testResults.push(`❌ Email: ${error}`);
    allPassed = false;
  }

  // Test 6: Monthly Report Generation
  try {
    await interaction.editReply({
      content:
        "🧪 **Running Full System Test**\n\n✅ Test 1/6: Configuration\n✅ Test 2/6: Firebase write\n✅ Test 3/6: Firebase read\n✅ Test 4/6: Discord channel\n✅ Test 5/6: Email\n✅ Test 6/6: Monthly report\n\n⏳ Finalizing...",
    });
    console.log("\n📋 Test 6/6: Monthly Report Generation");

    const originalBossEmail = process.env.BOSS_EMAIL;
    process.env.BOSS_EMAIL = debugEmail;

    try {
      const today = new Date();
      const endDate = new Date(today.getFullYear(), today.getMonth(), 21);
      const startDate = new Date(endDate);
      startDate.setMonth(startDate.getMonth() - 1);
      startDate.setDate(22);

      const startDateString = formatDateToYYYYMMDD(startDate);
      const endDateString = formatDateToYYYYMMDD(endDate);

      await sendMonthlyReport(
        startDateString,
        endDateString,
        startDate,
        endDate
      );

      console.log(
        `✅ Monthly report generated and sent to ${debugEmail} for period ${startDateString} - ${endDateString}`
      );
      testResults.push(
        `✅ Monthly Report (${startDateString} - ${endDateString})`
      );
    } finally {
      process.env.BOSS_EMAIL = originalBossEmail;
    }
  } catch (error) {
    console.error("❌ Monthly report failed:", error);
    testResults.push(`❌ Monthly Report: ${error}`);
    allPassed = false;
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🧪 FULL SYSTEM TEST COMPLETED");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(
    `Result: ${allPassed ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED"}`
  );
  console.log("\nTest Results:");
  testResults.forEach((result) => console.log(`  ${result}`));
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const finalMessage = `
🧪 **Full System Test Complete**

${allPassed ? "✅ **ALL TESTS PASSED!**" : "⚠️ **SOME TESTS FAILED**"}

**Test Results:**
${testResults.join("\n")}

**Summary:**
• Total Tests: 6
• Passed: ${testResults.filter((r) => r.startsWith("✅")).length}
• Failed: ${testResults.filter((r) => r.startsWith("❌")).length}

**Email Reports Sent To:** ${debugEmail}

${
  allPassed
    ? "🎉 **System is fully operational!**"
    : "⚠️ **Please check the errors above**"
}
`;

  await interaction.editReply({ content: finalMessage });

  console.log("\n🧹 Cleaning up test data from database...");
  try {
    const deletedCount = await deleteTestLogs();
    if (deletedCount > 0) {
      console.log(`✅ Cleaned up ${deletedCount} test log(s)`);
    }
  } catch (error) {
    console.error("⚠️ Failed to clean up test data:", error);
  }
}

async function handleTestEmail(
  interaction: ChatInputCommandInteraction<CacheType>
): Promise<void> {
  const debugEmail = interaction.options.getString("email");
  const originalBossEmail = process.env.BOSS_EMAIL;

  if (debugEmail) {
    process.env.BOSS_EMAIL = debugEmail;
  }

  await interaction.editReply({ content: "📧 Sending test email..." });

  try {
    await sendTestEmail();
    await interaction.editReply({
      content: `✅ Test email sent successfully to **${
        debugEmail || process.env.BOSS_EMAIL
      }**\n\nCheck your inbox!`,
    });
  } catch (error) {
    throw new Error(
      `Failed to send test email: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  } finally {
    if (debugEmail) {
      process.env.BOSS_EMAIL = originalBossEmail;
    }
  }
}

async function handleMonthlyHeader(
  interaction: ChatInputCommandInteraction<CacheType>
): Promise<void> {
  const channelId = process.env.LOG_CHANNEL_ID;

  if (!channelId) {
    throw new Error("LOG_CHANNEL_ID not configured");
  }

  const channel = await interaction.client.channels.fetch(channelId);

  if (!channel || !channel.isTextBased()) {
    throw new Error("Channel not found or not text-based");
  }

  const now = new Date();
  const monthYear = format(now, "MMMM yyyy");
  const message = `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n**${monthYear}**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  await (channel as TextChannel).send(message);

  await interaction.editReply({
    content: `✅ Posted monthly header for **${monthYear}** in <#${channelId}>`,
  });
}

async function handleMonthlyReport(
  interaction: ChatInputCommandInteraction<CacheType>
): Promise<void> {
  const startDateInput = interaction.options.getString("start-date");
  const endDateInput = interaction.options.getString("end-date");
  const debugEmail = interaction.options.getString("email");
  const originalBossEmail = process.env.BOSS_EMAIL;

  if (debugEmail) {
    process.env.BOSS_EMAIL = debugEmail;
  }

  let startDate: Date;
  let endDate: Date;
  let startDateString: string;
  let endDateString: string;

  if (startDateInput && endDateInput) {
    startDate = new Date(startDateInput);
    endDate = new Date(endDateInput);
    startDateString = startDateInput;
    endDateString = endDateInput;
  } else {
    const today = new Date();
    endDate = new Date(today.getFullYear(), today.getMonth(), 21);
    startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 1);
    startDate.setDate(22);
    startDateString = formatDateToYYYYMMDD(startDate);
    endDateString = formatDateToYYYYMMDD(endDate);
  }

  await interaction.editReply({
    content: `📊 Generating monthly report for **${startDateString}** to **${endDateString}**...`,
  });

  try {
    await sendMonthlyReport(startDateString, endDateString, startDate, endDate);

    await interaction.editReply({
      content: `✅ Monthly report generated and sent!\n\n**Period:** ${startDateString} to ${endDateString}\n**Sent to:** ${
        debugEmail || process.env.BOSS_EMAIL
      }`,
    });
  } catch (error) {
    throw new Error(
      `Failed to generate report: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  } finally {
    if (debugEmail) {
      process.env.BOSS_EMAIL = originalBossEmail;
    }
  }
}

async function handleStatus(
  interaction: ChatInputCommandInteraction<CacheType>
): Promise<void> {
  const config = {
    discord: {
      token: process.env.DISCORD_TOKEN ? "✅ Set" : "❌ Missing",
      clientId: process.env.CLIENT_ID ? "✅ Set" : "❌ Missing",
      guildId: process.env.GUILD_ID ? "✅ Set" : "❌ Missing",
      channelId: process.env.LOG_CHANNEL_ID ? "✅ Set" : "❌ Missing",
    },
    firebase: {
      credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS
        ? "✅ Set"
        : "❌ Missing",
    },
    email: {
      host: process.env.SMTP_HOST || "❌ Missing",
      port: process.env.SMTP_PORT || "❌ Missing",
      user: process.env.SMTP_USER ? "✅ Set" : "❌ Missing",
      pass: process.env.SMTP_PASS ? "✅ Set" : "❌ Missing",
      from: process.env.YOUR_EMAIL_ADDRESS || "❌ Missing",
      to: process.env.BOSS_EMAIL || "❌ Missing",
    },
  };

  const statusMessage = `
**🤖 Bot Status**

**Discord Configuration:**
• Token: ${config.discord.token}
• Client ID: ${config.discord.clientId}
• Guild ID: ${config.discord.guildId}
• Log Channel: ${config.discord.channelId}

**Firebase Configuration:**
• Credentials: ${config.firebase.credentials}

**Email Configuration:**
• SMTP Host: ${config.email.host}
• SMTP Port: ${config.email.port}
• SMTP User: ${config.email.user}
• SMTP Pass: ${config.email.pass}
• From Email: ${config.email.from}
• To Email: ${config.email.to}

**Bot Information:**
• Servers: ${interaction.client.guilds.cache.size}
• Uptime: ${formatUptime(process.uptime())}
• Node Version: ${process.version}
`;

  await interaction.editReply({ content: statusMessage });
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(" ");
}
