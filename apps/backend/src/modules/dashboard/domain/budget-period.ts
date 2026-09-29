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
  /** 반복 판별 관찰 구간 시작일(기준 월 직전 N개 완료 월의 첫날) */
  observationStartDate: Date;
  /** 반영 후보 표시 기간 시작일(기준 월 포함 최근 N개월의 첫날) */
  candidateRecentStartDate: Date;
}

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isValidMonthString(value: string): boolean {
  return MONTH_PATTERN.test(value);
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

export function calcBudgetPeriods(
  baseMonth: string,
  observationMonths: number,
  candidateRecentMonths: number
): BudgetPeriods {
  const match = MONTH_PATTERN.exec(baseMonth);
  if (!match) {
    throw new Error(`잘못된 기준 월 형식입니다: ${baseMonth}`);
  }
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;

  return {
    base: monthPeriod(year, monthIndex),
    next: monthPeriod(year, monthIndex + 1),
    observationStartDate: new Date(Date.UTC(year, monthIndex - observationMonths, 1)),
    candidateRecentStartDate: new Date(Date.UTC(year, monthIndex - (candidateRecentMonths - 1), 1))
  };
}

export function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}
