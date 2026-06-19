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

export function formatWeekLabel(range: { start: string; end: string }): string {
  const s = new Date(`${range.start}T00:00:00`);
  const e = new Date(`${range.end}T00:00:00`);
  return `${s.getMonth() + 1}월 ${s.getDate()}일 - ${e.getMonth() + 1}월 ${e.getDate()}일`;
}

export function getWeekYearLabel(range: { start: string; end: string }, currentYear: number): string | null {
  const sy = parseInt(range.start.slice(0, 4));
  const ey = parseInt(range.end.slice(0, 4));
  if (sy === currentYear && ey === currentYear) return null;
  if (sy === ey) return `${sy}년`;
  return `${sy} / ${ey}년`;
}
