/**
 * Application constants and configuration
 */

// Billing period configuration (22nd to 21st of next month)
export const BILLING_PERIOD = {
  START_DAY: 22,
  END_DAY: 21,
} as const;

// Dutch month names for parsing
export const DUTCH_MONTHS: Record<string, number> = {
  'januari': 0, 'jan': 0,
  'februari': 1, 'feb': 1,
  'maart': 2, 'mrt': 2,
  'april': 3, 'apr': 3,
  'mei': 4,
  'juni': 5, 'jun': 5,
  'juli': 6, 'jul': 6,
  'augustus': 7, 'aug': 7,
  'september': 8, 'sep': 8, 'sept': 8,
  'oktober': 9, 'okt': 9,
  'november': 10, 'nov': 10,
  'december': 11, 'dec': 11,
};

// Dutch month names for display (nominative case)
export const DUTCH_MONTH_NAMES = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december'
];

// Discord message limits
export const DISCORD_MESSAGE_LIMIT = 2000;
export const DISCORD_MESSAGE_SAFE_LIMIT = 1900;
