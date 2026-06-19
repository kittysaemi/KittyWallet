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
  const sm = s.getMonth() + 1;
  const em = e.getMonth() + 1;
  const thisYear = currentYear ?? new Date().getFullYear();

  const yPrefix = (y: number) => y !== thisYear ? `'${String(y).slice(2)}년 ` : "";

  if (sy === ey) {
    if (sm === em) {
      // 같은 달: "6월 15 - 21일" or "'25년 3월 2 - 8일"
      return `${yPrefix(sy)}${sm}월 ${s.getDate()} - ${e.getDate()}일`;
    }
    // 같은 연도, 다른 달: "5월 30 - 6월 5일" or "'25년 5월 30 - 6월 5일"
    return `${yPrefix(sy)}${sm}월 ${s.getDate()} - ${em}월 ${e.getDate()}일`;
  }
  // 연 경계: "'25년 12월 28 - '26년 1월 3일"
  return `${yPrefix(sy)}${sm}월 ${s.getDate()} - ${yPrefix(ey)}${em}월 ${e.getDate()}일`;
}
