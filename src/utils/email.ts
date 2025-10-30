import nodemailer from "nodemailer";
import { format } from "date-fns";
import {
  getHoursByDateRange,
  deleteTestLogs,
  getAllUsers,
} from "./firebaseService";
import { MonthlyReport, UserHoursSummary, HourLog } from "../types";

/**
 * Create email transporter using SMTP configuration
 */
function createTransporter(): nodemailer.Transporter {
  const port = parseInt(process.env.SMTP_PORT || "587");
  const host = process.env.SMTP_HOST || "smtp.gmail.com";

  console.log(`📧 Creating email transporter for ${host}:${port}`);

  return nodemailer.createTransport({
    host: host,
    port: port,
    secure: port === 465, // true for 465 (SSL), false for 587 (TLS)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Gmail-specific options
    tls: {
      rejectUnauthorized: false, // Allow self-signed certificates
    },
  });
}

/**
 * Generate plain text report from hour logs
 */
function generatePlainTextReport(report: MonthlyReport): string {
  const { period, userSummaries } = report;

  let text = "╔═══════════════════════════════════════════════════╗\n";
  text += "║       MAANDELIJKS URENRAPPORT                      ║\n";
  text += "╚═══════════════════════════════════════════════════╝\n\n";

  text += `Facturatieperiode: ${format(
    new Date(period.startDateString),
    "dd MMMM yyyy"
  )} t/m ${format(new Date(period.endDateString), "dd MMMM yyyy")}\n`;
  text += "═══════════════════════════════════════════════════\n\n";

  userSummaries.forEach((userSummary, index) => {
    text += `\n${index + 1}. ${userSummary.username}\n`;
    text += `   Totaal: ${userSummary.totalHours.toFixed(2)} uur\n`;
    text += "   ───────────────────────────────────────────────\n";

    userSummary.logs.forEach((log) => {
      const dateStr = format(new Date(log.date), "dd-MM-yyyy");
      const desc = log.description || "-";
      text += `   ${dateStr}  |  ${log.hours}u  |  ${desc}\n`;
    });

    text += "\n";
  });

  text += "═══════════════════════════════════════════════════\n";
  text += "Einde Rapport\n";
  text += "═══════════════════════════════════════════════════\n";

  return text;
}

/**
 * Generate HTML email template from hour logs
 */
function generateHtmlReport(report: MonthlyReport): string {
  const { period, userSummaries } = report;

  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Monthly Work Hours Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .email-wrapper {
      max-width: 800px;
      margin: 0 auto;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #5865F2;
      border-bottom: 3px solid #5865F2;
      padding-bottom: 15px;
      margin-top: 0;
    }
    .period {
      background-color: #f0f4ff;
      padding: 15px 20px;
      border-radius: 6px;
      margin: 20px 0;
      border-left: 4px solid #5865F2;
      font-size: 16px;
    }
    .period-label {
      font-weight: 600;
      color: #555;
    }
    .user-section {
      margin: 30px 0;
      padding: 20px;
      background-color: #fafafa;
      border-radius: 6px;
      border-left: 4px solid #5865F2;
    }
    .user-header {
      width: 100%;
      margin-bottom: 15px;
    }
    .user-header-table {
      width: 100%;
      border-collapse: collapse;
    }
    .user-header-table td {
      padding: 0;
      border: none;
      background: transparent;
    }
    .username {
      font-size: 20px;
      font-weight: 600;
      color: #333;
    }
    .user-total {
      font-size: 18px;
      font-weight: bold;
      color: #2d7d46;
      text-align: right;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    th {
      background-color: #5865F2;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    .hours-column {
      text-align: right;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e0e0e0;
    }
    tr:hover {
      background-color: #f5f5f5;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="container">
      <h1>📊 Maandelijks Urenrapport</h1>
      
      <div class="period">
        <span class="period-label">Periode:</span> 
        ${format(
          new Date(period.startDateString),
          "dd MMMM yyyy"
        )} t/m ${format(new Date(period.endDateString), "dd MMMM yyyy")}
      </div>
`;

  userSummaries.forEach((userSummary, index) => {
    html += `
    <div class="user-section">
      <div class="user-header">
        <table class="user-header-table">
          <tr>
            <td class="username">${index + 1}. ${userSummary.username}</td>
            <td class="user-total">${userSummary.totalHours.toFixed(2)}u</td>
          </tr>
        </table>
      </div>
      <table>
        <thead>
          <tr>
            <th>Datum</th>
            <th class="hours-column">Uren</th>
            <th>Omschrijving</th>
          </tr>
        </thead>
        <tbody>
`;

    userSummary.logs.forEach((log) => {
      html += `
          <tr>
            <td>${format(new Date(log.date), "dd-MM-yyyy")}</td>
            <td class="hours-column">${log.hours}u</td>
            <td>${log.description || "-"}</td>
          </tr>
`;
    });

    html += `
        </tbody>
      </table>
    </div>
`;
  });

  html += `
      <div class="footer">
        <p>Dit rapport is automatisch gegenereerd door Teun's Uren Logger</p>
        <p>Gegenereerd op ${format(new Date(), "dd MMMM yyyy HH:mm")}</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

  return html;
}

/**
 * Aggregate hour logs by user
 */
function aggregateHoursByUser(logs: HourLog[]): UserHoursSummary[] {
  const userMap = new Map<string, UserHoursSummary>();

  logs.forEach((log) => {
    if (!userMap.has(log.discordUserId)) {
      userMap.set(log.discordUserId, {
        username: log.discordUsername,
        userId: log.discordUserId,
        totalHours: 0,
        logs: [],
      });
    }

    const userSummary = userMap.get(log.discordUserId)!;
    userSummary.totalHours += log.hours;
    userSummary.logs.push(log);
  });

  return Array.from(userMap.values()).sort(
    (a, b) => b.totalHours - a.totalHours
  );
}

/**
 * Send monthly report email
 */
export async function sendMonthlyReport(
  startDateString: string,
  endDateString: string,
  startDate: Date,
  endDate: Date
): Promise<void> {
  try {
    // Fetch all hours for the billing period
    const logs = await getHoursByDateRange(startDateString, endDateString);

    // Aggregate data (even if empty)
    const userSummaries = aggregateHoursByUser(logs);
    const totalHours = userSummaries.reduce(
      (sum, user) => sum + user.totalHours,
      0
    );

    const report: MonthlyReport = {
      period: {
        startDate,
        endDate,
        startDateString,
        endDateString,
      },
      userSummaries,
      totalHours,
      totalUsers: userSummaries.length,
    };

    if (logs.length === 0) {
      console.log(
        "⚠️  No hours logged for this billing period - sending empty report"
      );
    }

    // Generate report text and HTML
    const reportText = generatePlainTextReport(report);
    const reportHtml = generateHtmlReport(report);

    // Get all users with registered emails for CC
    const allUsers = await getAllUsers();
    const ccEmails = allUsers
      .filter((user) => user.email)
      .map((user) => user.email as string);

    // Send email
    const transporter = createTransporter();
    const monthYear = format(endDate, "MMMM yyyy");

    const mailOptions: any = {
      from: process.env.YOUR_EMAIL_ADDRESS,
      to: process.env.BOSS_EMAIL,
      subject: `Maandelijks Urenrapport - ${monthYear}`,
      text: reportText,
      html: reportHtml,
    };

    // Add CC if there are registered emails
    if (ccEmails.length > 0) {
      mailOptions.cc = ccEmails.join(", ");
      console.log(`📧 Sending CC to: ${ccEmails.join(", ")}`);
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`✓ Monthly report email sent: ${info.messageId}`);
  } catch (error) {
    console.error("✗ Error sending monthly report:", error);
    throw error;
  }
}

/**
 * Send a test email to verify SMTP configuration - uses REAL DATA from current month
 */
export async function sendTestEmail(): Promise<void> {
  try {
    const transporter = createTransporter();

    // Get the current billing period (22nd to today)
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Start date is the 22nd of the current month or last month
    let startDate: Date;
    if (today.getDate() >= 22) {
      startDate = new Date(currentYear, currentMonth, 22);
    } else {
      startDate = new Date(currentYear, currentMonth - 1, 22);
    }

    const startDateString = format(startDate, "yyyy-MM-dd");
    const endDateString = format(today, "yyyy-MM-dd");

    console.log(
      `\n📊 Fetching hours from ${startDateString} to ${endDateString}`
    );

    // Fetch REAL hour logs from the database
    const logs = await getHoursByDateRange(startDateString, endDateString);

    if (logs.length === 0) {
      console.log(
        "⚠️  No hours logged in current period - sending empty report"
      );
    } else {
      console.log(`✅ Found ${logs.length} log(s) for this period`);
    }

    // Aggregate data
    const userSummaries = aggregateHoursByUser(logs);
    const totalHours = userSummaries.reduce(
      (sum, user) => sum + user.totalHours,
      0
    );

    const testReport: MonthlyReport = {
      period: {
        startDate,
        endDate: today,
        startDateString,
        endDateString,
      },
      userSummaries,
      totalHours,
      totalUsers: userSummaries.length,
    };

    const reportText = generatePlainTextReport(testReport);
    const reportHtml = generateHtmlReport(testReport);
    const monthYear = format(today, "MMMM yyyy");

    const mailOptions = {
      from: process.env.YOUR_EMAIL_ADDRESS,
      to: process.env.BOSS_EMAIL,
      subject: `🧪 TEST - Huidige Maand Uren (sinds 22e) - ${monthYear}`,
      text: reportText,
      html: reportHtml,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✓ Test email sent: ${info.messageId}`);

    // Clean up test logs from database
    console.log("\n🧹 Cleaning up test data from database...");
    const deletedCount = await deleteTestLogs();
    if (deletedCount > 0) {
      console.log(`✅ Cleaned up ${deletedCount} test log(s) from database`);
    }
  } catch (error) {
    console.error("✗ Error sending test email:", error);
    throw error;
  }
}
