const DEFAULT_TIMEZONE = "Asia/Seoul";

export function getTodayInTimezone(timezone?: string): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: timezone ?? DEFAULT_TIMEZONE });
}

export function getMonthInTimezone(timezone?: string): string {
  return getTodayInTimezone(timezone).slice(0, 7);
}
