const nodemailer = require("nodemailer");
const { getAllHours } = require("./firebaseService");
const { startOfWeek, endOfWeek, format } = require("date-fns");

/**
 * Create email transporter
 */
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
}

/**
 * Generate weekly report HTML
 */
function generateReportHTML(hours, startDate, endDate) {
  // Group hours by user
  const userHours = {};
  let totalHours = 0;

  hours.forEach((entry) => {
    if (!userHours[entry.username]) {
      userHours[entry.username] = {
        total: 0,
        entries: [],
      };
    }

    userHours[entry.username].total += entry.hours;
    userHours[entry.username].entries.push(entry);
    totalHours += entry.hours;
  });

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        h1 {
          color: #5865F2;
          border-bottom: 3px solid #5865F2;
          padding-bottom: 10px;
        }
        h2 {
          color: #57F287;
          margin-top: 30px;
        }
        .summary {
          background-color: #f0f0f0;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
        }
        .user-section {
          margin-bottom: 30px;
          border-left: 4px solid #5865F2;
          padding-left: 15px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        th, td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        th {
          background-color: #5865F2;
          color: white;
        }
        .total {
          font-weight: bold;
          font-size: 1.2em;
          color: #57F287;
        }
      </style>
    </head>
    <body>
      <h1>📊 Weekly Work Hours Report</h1>
      <div class="summary">
        <p><strong>Period:</strong> ${format(
          startDate,
          "MMMM dd, yyyy"
        )} - ${format(endDate, "MMMM dd, yyyy")}</p>
        <p class="total">Total Hours: ${totalHours.toFixed(2)}</p>
        <p><strong>Number of Contributors:</strong> ${
          Object.keys(userHours).length
        }</p>
      </div>
  `;

  // Add section for each user
  Object.keys(userHours).forEach((username) => {
    const userData = userHours[username];
    html += `
      <div class="user-section">
        <h2>${username}</h2>
        <p class="total">Total: ${userData.total.toFixed(2)} hours</p>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Hours</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
    `;

    userData.entries.forEach((entry) => {
      html += `
        <tr>
          <td>${format(new Date(entry.date), "yyyy-MM-dd")}</td>
          <td>${entry.hours}</td>
          <td>${entry.description}</td>
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
    </body>
    </html>
  `;

  return html;
}

/**
 * Send weekly work hours report
 */
async function sendWeeklyReport() {
  try {
    // Get date range for the week
    const now = new Date();
    const startDate = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const endDate = endOfWeek(now, { weekStartsOn: 1 }); // Sunday

    // Fetch hours from Firebase
    const hours = await getAllHours(startDate, endDate);

    if (hours.length === 0) {
      console.log("No hours to report for this week");
      return;
    }

    // Generate report HTML
    const htmlContent = generateReportHTML(hours, startDate, endDate);

    // Send email
    const transporter = createTransporter();
    const recipients = process.env.REPORT_RECIPIENTS.split(",").map((email) =>
      email.trim()
    );

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: recipients,
      subject: `Weekly Work Hours Report - ${format(
        startDate,
        "MMM dd"
      )} to ${format(endDate, "MMM dd, yyyy")}`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✓ Email sent: ${info.messageId}`);

    return info;
  } catch (error) {
    console.error("✗ Error sending weekly report:", error);
    throw error;
  }
}

/**
 * Send a test email
 */
async function sendTestEmail() {
  try {
    const transporter = createTransporter();
    const recipients = process.env.REPORT_RECIPIENTS.split(",").map((email) =>
      email.trim()
    );

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: recipients,
      subject: "Test Email - Discord Hour Logger Bot",
      html: "<h1>Test Email</h1><p>This is a test email from the Discord Hour Logger bot. Email configuration is working correctly!</p>",
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✓ Test email sent: ${info.messageId}`);

    return info;
  } catch (error) {
    console.error("✗ Error sending test email:", error);
    throw error;
  }
}

module.exports = {
  sendWeeklyReport,
  sendTestEmail,
};
