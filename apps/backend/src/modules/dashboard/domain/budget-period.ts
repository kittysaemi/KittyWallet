// 예산 계산기 계산 기간 날짜 처리(예산계산기정책.md 4.1).
// 거래일(transactionDate)은 달력 날짜를 UTC 자정으로 저장하므로, 기간 경계도 같은
// 방식(UTC 자정)으로 만들어 서버 로컬 시간대와 무관하게 계산한다.

const DATE_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** `YYYY-MM-DD` 형식이며 실제 존재하는 날짜인지(예: 2026-02-30 거부). */
export function isValidDateString(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }
  const date = fromDateString(value);
  return !Number.isNaN(date.getTime()) && toDateString(date) === value;
}

export function fromDateString(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}
