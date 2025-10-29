import { parse, parseISO, isValid, format } from "date-fns";
import { zonedTimeToUtc } from "date-fns-tz";

/**
 * Parse a flexible date string into a Date object
 * Supports formats like:
 * - "yesterday"
 * - "22 oct"
 * - "2025-10-22"
 * - ISO dates
 *
 * Returns current date if no string provided or parsing fails
 */
export function parseDateString(dateString?: string): Date {
  if (!dateString || dateString.trim() === "") {
    return new Date();
  }

  const trimmed = dateString.trim().toLowerCase();
  const now = new Date();

  // Handle "yesterday"
  if (trimmed === "yesterday") {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }

  // Handle "today"
  if (trimmed === "today") {
    return now;
  }

  // Try parsing ISO format (YYYY-MM-DD)
  const isoDate = parseISO(dateString);
  if (isValid(isoDate)) {
    return isoDate;
  }

  // Try parsing common formats like "22 oct", "oct 22", "22 october"
  const formats = [
    "d MMM",
    "MMM d",
    "d MMMM",
    "MMMM d",
    "yyyy-MM-dd",
    "MM/dd/yyyy",
    "dd/MM/yyyy",
  ];

  for (const formatString of formats) {
    try {
      const parsed = parse(dateString, formatString, now);
      if (isValid(parsed)) {
        return parsed;
      }
    } catch (error) {
      // Continue to next format
    }
  }

  // If all parsing fails, return current date
  console.warn(`Could not parse date "${dateString}", using current date`);
  return now;
}

/**
 * Format a Date object to YYYY-MM-DD string
 */
export function formatDateToYYYYMMDD(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Get the current date as YYYY-MM-DD string
 */
export function getCurrentDateString(): string {
  return formatDateToYYYYMMDD(new Date());
}
