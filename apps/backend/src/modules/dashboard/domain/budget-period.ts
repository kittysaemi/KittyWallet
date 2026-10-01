// 예산 계산기 기간 계산(예산계산기정책.md 4.1).
// 거래일(transactionDate)은 달력 날짜를 UTC 자정으로 저장하므로, 기간 경계도 같은
// 방식(Date.UTC)으로 만들어 서버 로컬 시간대와 무관하게 계산한다.

export interface MonthPeriod {
  year: number;
  month: number;
  startDate: Date;
  endDate: Date;
}

export interface BudgetPeriods {
  base: MonthPeriod;
  next: MonthPeriod;
}

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DATE_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function isValidMonthString(value: string): boolean {
  return MONTH_PATTERN.test(value);
}

/** `YYYY-MM-DD` 형식이며 실제 존재하는 날짜인지(예: 2026-02-30 거부). */
export function isValidDateString(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }
  const date = fromDateString(value);
  return !Number.isNaN(date.getTime()) && toDateString(date) === value;
}

function monthPeriod(year: number, monthIndex: number): MonthPeriod {
  const startDate = new Date(Date.UTC(year, monthIndex, 1));
  // Date.UTC(year, monthIndex + 1, 0)은 해당 월의 말일이다(윤년 포함).
  const endDate = new Date(Date.UTC(year, monthIndex + 1, 0));
  return {
    year: startDate.getUTCFullYear(),
    month: startDate.getUTCMonth() + 1,
    startDate,
    endDate
  };
}

function parseMonth(value: string): { year: number; monthIndex: number } {
  const match = MONTH_PATTERN.exec(value);
  if (!match) {
    throw new Error(`잘못된 기준 월 형식입니다: ${value}`);
  }
  return { year: Number(match[1]), monthIndex: Number(match[2]) - 1 };
}

export function calcBudgetPeriods(baseMonth: string): BudgetPeriods {
  const { year, monthIndex } = parseMonth(baseMonth);
  return {
    base: monthPeriod(year, monthIndex),
    next: monthPeriod(year, monthIndex + 1)
  };
}

/** `YYYY-MM`의 지난달 `YYYY-MM`. */
export function previousMonthString(month: string): string {
  const { year, monthIndex } = parseMonth(month);
  return toDateString(new Date(Date.UTC(year, monthIndex - 1, 1))).slice(0, 7);
}

export function fromDateString(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}
