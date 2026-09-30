// 카드 고정지출 자동 등록 기간·날짜 계산(거래정책.md 10장).
// 거래일(transactionDate)은 달력 날짜를 UTC 자정으로 저장하므로 날짜 계산도 Date.UTC로 맞춘다.

export interface FixedExpensePeriod {
  /** 지난달 1일 (UTC 자정) */
  sourceStartDate: Date;
  /** 지난달 말일 (UTC 자정) */
  sourceEndDate: Date;
  /** 이번 달 연도 */
  targetYear: number;
  /** 이번 달 월 인덱스(0~11) */
  targetMonthIndex: number;
}

/** "YYYY-MM-DD"(실행일, 사용자 시간대 기준 오늘)로 지난달 원본 기간과 이번 달을 구한다. */
export function calcFixedExpensePeriod(today: string): FixedExpensePeriod {
  const [year, month] = today.split("-").map(Number);
  const targetMonthIndex = month - 1;
  return {
    sourceStartDate: new Date(Date.UTC(year, targetMonthIndex - 1, 1)),
    sourceEndDate: new Date(Date.UTC(year, targetMonthIndex, 0)),
    targetYear: year,
    targetMonthIndex
  };
}

/** 원본 일자를 이번 달로 옮긴다. 이번 달에 해당 일자가 없으면 말일로 등록한다. */
export function toTargetDate(sourceDate: Date, targetYear: number, targetMonthIndex: number): Date {
  const lastDay = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(targetYear, targetMonthIndex, Math.min(sourceDate.getUTCDate(), lastDay))
  );
}
