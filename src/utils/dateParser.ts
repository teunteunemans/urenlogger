import { parse, parseISO, isValid, format } from "date-fns";
import { nl } from "date-fns/locale";
import { DUTCH_MONTHS, BILLING_PERIOD } from "../config/constants";

/**
 * Parse result type for better error handling
 */
export interface ParseResult {
  success: boolean;
  date: Date | null;
  error?: string;
}

/**
 * Parse a flexible date string into a Date object
 * Supports Dutch and English formats:
 * - "vandaag", "today"
 * - "gisteren", "yesterday"
 * - "22 okt", "22 oktober"
 * - "2025-10-22"
 * - ISO dates
 *
 * Returns null if parsing fails (instead of silently returning today's date)
 */
export function parseDateString(dateString?: string): Date | null {
  if (!dateString || dateString.trim() === "") {
    return new Date();
  }

  const trimmed = dateString.trim().toLowerCase();
  const now = new Date();

  // Handle Dutch "vandaag" / English "today"
  if (trimmed === "vandaag" || trimmed === "today") {
    return now;
  }

  // Handle Dutch "gisteren" / English "yesterday"
  if (trimmed === "gisteren" || trimmed === "yesterday") {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }

  // Handle Dutch "morgen" (tomorrow) - for validation purposes
  if (trimmed === "morgen" || trimmed === "tomorrow") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  // Try parsing ISO format (YYYY-MM-DD)
  const isoDate = parseISO(dateString);
  if (isValid(isoDate)) {
    return isoDate;
  }

  // Try parsing Dutch month names first (e.g., "22 okt", "15 januari")
  const dutchParsed = parseDutchDate(trimmed, now);
  if (dutchParsed) {
    return dutchParsed;
  }

  // Try parsing common English formats
  const formats = [
    "d MMM",
    "MMM d",
    "d MMMM",
    "MMMM d",
    "yyyy-MM-dd",
    "MM/dd/yyyy",
    "dd/MM/yyyy",
    "d-M-yyyy",
    "d/M/yyyy",
  ];

  for (const formatString of formats) {
    try {
      const parsed = parse(dateString, formatString, now);
      if (isValid(parsed)) {
        return parsed;
      }
    } catch {
      // Continue to next format
    }
  }

  // If all parsing fails, return null
  return null;
}

/**
 * Parse Dutch date formats like "22 okt", "15 januari", "3 dec"
 */
function parseDutchDate(input: string, referenceDate: Date): Date | null {
  // Match patterns like "22 okt", "15 januari", "3dec"
  const patterns = [
    /^(\d{1,2})\s*([a-z]+)$/,      // "22 okt" or "22okt"
    /^([a-z]+)\s*(\d{1,2})$/,      // "okt 22"
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      let day: number;
      let monthStr: string;

      if (/^\d/.test(match[1])) {
        // Day first: "22 okt"
        day = parseInt(match[1], 10);
        monthStr = match[2];
      } else {
        // Month first: "okt 22"
        monthStr = match[1];
        day = parseInt(match[2], 10);
      }

      const month = DUTCH_MONTHS[monthStr];
      if (month !== undefined && day >= 1 && day <= 31) {
        const result = new Date(referenceDate.getFullYear(), month, day);

        // If the date is in the future by more than a few months, assume last year
        const monthsDiff = (result.getMonth() - referenceDate.getMonth()) +
                          (result.getFullYear() - referenceDate.getFullYear()) * 12;
        if (monthsDiff > 3) {
          result.setFullYear(result.getFullYear() - 1);
        }

        return result;
      }
    }
  }

  return null;
}

/**
 * Parse a date string with explicit error handling
 */
export function parseDateStringWithError(dateString?: string): ParseResult {
  if (!dateString || dateString.trim() === "") {
    return { success: true, date: new Date() };
  }

  const result = parseDateString(dateString);
  if (result === null) {
    return {
      success: false,
      date: null,
      error: `Ongeldige datum: "${dateString}". Gebruik formaten zoals "vandaag", "gisteren", "22 okt", of "2025-10-22".`,
    };
  }

  return { success: true, date: result };
}

/**
 * Validate that a date is not in the future
 */
export function validateNotFuture(date: Date): { valid: boolean; error?: string } {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  if (date > today) {
    return {
      valid: false,
      error: "Je kunt geen uren loggen voor een datum in de toekomst.",
    };
  }

  return { valid: true };
}

/**
 * Format a Date object to YYYY-MM-DD string
 */
export function formatDateToYYYYMMDD(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Format a Date object to Dutch display format
 */
export function formatDateDutch(date: Date): string {
  return format(date, "d MMMM yyyy", { locale: nl });
}

/**
 * Format a Date object with day of week in Dutch
 */
export function formatDateWithDayDutch(date: Date): string {
  return format(date, "EEEE d MMMM", { locale: nl });
}

/**
 * Get the current date as YYYY-MM-DD string
 */
export function getCurrentDateString(): string {
  return formatDateToYYYYMMDD(new Date());
}

/**
 * Get current billing period dates
 * Billing period: 22nd of previous month to 21st of current month
 */
export function getCurrentBillingPeriod(): { startDate: Date; endDate: Date; label: string } {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  let startDate: Date;
  let endDate: Date;

  if (currentDay >= BILLING_PERIOD.START_DAY) {
    // We're past the 22nd, so current period is 22nd of this month to 21st of next month
    startDate = new Date(currentYear, currentMonth, BILLING_PERIOD.START_DAY);
    endDate = new Date(currentYear, currentMonth + 1, BILLING_PERIOD.END_DAY);
  } else {
    // We're before the 22nd, so current period is 22nd of last month to 21st of this month
    startDate = new Date(currentYear, currentMonth - 1, BILLING_PERIOD.START_DAY);
    endDate = new Date(currentYear, currentMonth, BILLING_PERIOD.END_DAY);
  }

  const label = `${formatDateDutch(startDate)} - ${formatDateDutch(endDate)}`;

  return { startDate, endDate, label };
}

/**
 * Parse a month string like "feb 2024", "maart 2025", "december"
 * Returns the billing period for that month (22nd to 21st of next month)
 */
export function parseMonthString(input: string): { startDate: Date; endDate: Date; label: string } | null {
  const trimmed = input.trim().toLowerCase();

  // Match patterns like "feb 2024", "maart 2025", "december", "dec"
  const withYearMatch = trimmed.match(/^([a-z]+)\s*(\d{4})$/);
  const monthOnlyMatch = trimmed.match(/^([a-z]+)$/);

  let monthStr: string;
  let year: number;

  if (withYearMatch) {
    monthStr = withYearMatch[1];
    year = parseInt(withYearMatch[2], 10);
  } else if (monthOnlyMatch) {
    monthStr = monthOnlyMatch[1];
    year = new Date().getFullYear();
  } else {
    return null;
  }

  const month = DUTCH_MONTHS[monthStr];
  if (month === undefined) {
    return null;
  }

  // Billing period for a given month starts on 22nd of that month
  // and ends on 21st of the next month
  const startDate = new Date(year, month, BILLING_PERIOD.START_DAY);
  const endDate = new Date(year, month + 1, BILLING_PERIOD.END_DAY);

  const label = `${formatDateDutch(startDate)} - ${formatDateDutch(endDate)}`;

  return { startDate, endDate, label };
}
