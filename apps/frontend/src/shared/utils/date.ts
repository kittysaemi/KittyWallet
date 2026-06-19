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
  const sm = `${s.getMonth() + 1}월 ${s.getDate()}일`;
  const em = `${e.getMonth() + 1}월 ${e.getDate()}일`;
  if (sy !== thisYear || ey !== thisYear) {
    if (sy === ey) return `${sy}년 ${sm} - ${em}`;
    return `${sy}년 ${sm} - ${ey}년 ${em}`;
  }
  return `${sm} - ${em}`;
}
