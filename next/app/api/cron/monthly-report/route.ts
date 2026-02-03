import { NextRequest } from "next/server";
import { format } from "date-fns";
import { sendMonthlyReport } from "@/lib/utils/email";
import { BILLING_PERIOD } from "@/lib/config/constants";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST Discord log channel message via REST API
 */
async function postToDiscordLog(message: string): Promise<void> {
  const channelId = process.env.LOG_CHANNEL_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!channelId || !botToken) return;

  try {
    const response = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bot ${botToken}`,
        },
        body: JSON.stringify({ content: message }),
      }
    );

    if (!response.ok) {
      console.warn(`Discord log POST failed (${response.status})`);
    }
  } catch (error) {
    console.warn("Could not post to Discord log channel:", error);
  }
}

/**
 * Vercel Cron Job handler for monthly report generation.
 *
 * Billing period: 22nd of previous month to 21st of current month.
 * Schedule: 00:00 UTC on the 21st of every month (configured in vercel.json).
 */
export async function GET(request: NextRequest): Promise<Response> {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();

    // Billing period: 22nd of last month to 21st of this month
    const endDate = new Date(today);
    endDate.setDate(BILLING_PERIOD.END_DAY);

    const startDate = new Date(today);
    startDate.setMonth(startDate.getMonth() - 1);
    startDate.setDate(BILLING_PERIOD.START_DAY);

    const startDateString = format(startDate, "yyyy-MM-dd");
    const endDateString = format(endDate, "yyyy-MM-dd");

    console.log(
      `Generating monthly report: ${startDateString} to ${endDateString}`
    );

    await sendMonthlyReport(startDateString, endDateString, startDate, endDate);

    console.log("Monthly report sent successfully");

    // Post success notification to Discord
    await postToDiscordLog(
      `Maandrapport voor **${startDateString}** t/m **${endDateString}** succesvol verstuurd naar ${process.env.BOSS_EMAIL}`
    );

    return Response.json({
      success: true,
      period: { start: startDateString, end: endDateString },
    });
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Onbekende fout";

    console.error("Error generating monthly report:", error);

    // Post failure notification to Discord
    await postToDiscordLog(
      `Fout bij het genereren van het maandrapport: ${errorMsg}`
    );

    return Response.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
