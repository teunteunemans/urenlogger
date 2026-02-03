export interface User {
  discordUserId: string;
  registeredName: string; // The name they want to use for reports
  registeredAt: string; // ISO String
  email?: string; // Optional email to receive CC of monthly reports
}

export interface HourLog {
  discordUserId: string;
  discordUsername: string;
  hours: number;
  date: string; // Format: YYYY-MM-DD
  description?: string; // Optional work description
  logTimestamp: string; // ISO String
}

export interface BillingPeriod {
  startDate: Date;
  endDate: Date;
  startDateString: string;
  endDateString: string;
}

export interface UserHoursSummary {
  username: string;
  userId: string;
  totalHours: number;
  logs: HourLog[];
}

export interface MonthlyReport {
  period: BillingPeriod;
  userSummaries: UserHoursSummary[];
  totalHours: number;
  totalUsers: number;
}
