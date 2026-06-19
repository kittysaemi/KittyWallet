const DEFAULT_TIMEZONE = "Asia/Seoul";

export function getTodayInTimezone(timezone?: string): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: timezone ?? DEFAULT_TIMEZONE });
}

export function getMonthInTimezone(timezone?: string): string {
  return getTodayInTimezone(timezone).slice(0, 7);
}

export function toDateValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getWeekRange(date: Date): { start: string; end: string } {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: toDateValue(start), end: toDateValue(end) };
}

export function formatWeekLabel(range: { start: string; end: string }, currentYear?: number): string {
  const s = new Date(`${range.start}T00:00:00`);
  const e = new Date(`${range.end}T00:00:00`);
  const sy = s.getFullYear();
  const ey = e.getFullYear();
  const thisYear = currentYear ?? new Date().getFullYear();
  const sm = `${s.getMonth() + 1}/${s.getDate()}`;
  const em = `${e.getMonth() + 1}/${e.getDate()}`;
  if (sy === thisYear && ey === thisYear) return `${sm} - ${em}`;
  if (sy === ey) return `'${String(sy).slice(2)} ${sm} - ${em}`;
  return `'${String(sy).slice(2)} ${sm} - '${String(ey).slice(2)} ${em}`;
}
