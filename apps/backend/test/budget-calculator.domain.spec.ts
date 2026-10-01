import {
  calcBudgetPeriods,
  isValidDateString,
  previousMonthString,
  toDateString
} from "../src/modules/dashboard/domain/budget-period";

describe("calcBudgetPeriods — 기준 월·다음 달 경계", () => {
  let originalTz: string | undefined;
  beforeAll(() => {
    originalTz = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";
  });
  afterAll(() => {
    process.env.TZ = originalTz;
  });

  it("12월 기준 월이면 다음 달은 다음 해 1월이다", () => {
    const periods = calcBudgetPeriods("2026-12");
    expect(toDateString(periods.base.startDate)).toBe("2026-12-01");
    expect(toDateString(periods.base.endDate)).toBe("2026-12-31");
    expect(periods.next).toMatchObject({ year: 2027, month: 1 });
    expect(toDateString(periods.next.endDate)).toBe("2027-01-31");
  });

  it("윤년 2월의 말일은 29일이다", () => {
    expect(toDateString(calcBudgetPeriods("2028-01").next.endDate)).toBe("2028-02-29");
    expect(toDateString(calcBudgetPeriods("2027-02").base.endDate)).toBe("2027-02-28");
  });
});

describe("previousMonthString — 지난달", () => {
  it("1월의 지난달은 전년도 12월이다", () => {
    expect(previousMonthString("2027-01")).toBe("2026-12");
    expect(previousMonthString("2026-10")).toBe("2026-09");
  });
});

describe("isValidDateString — 잔액 기준일 형식", () => {
  it("실제 존재하는 YYYY-MM-DD만 허용한다", () => {
    expect(isValidDateString("2026-09-30")).toBe(true);
    expect(isValidDateString("2028-02-29")).toBe(true);
    expect(isValidDateString("2026-02-30")).toBe(false);
    expect(isValidDateString("2026-9-30")).toBe(false);
    expect(isValidDateString("2026-09-31")).toBe(false);
  });
});
