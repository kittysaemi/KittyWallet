import {
  fromDateString,
  isValidDateString,
  toDateString
} from "../src/modules/dashboard/domain/budget-period";

describe("fromDateString / toDateString — 계산 기간 경계", () => {
  let originalTz: string | undefined;
  beforeAll(() => {
    originalTz = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";
  });
  afterAll(() => {
    process.env.TZ = originalTz;
  });

  it("서버 로컬 시간대와 무관하게 달력 날짜를 UTC 자정으로 만든다", () => {
    expect(fromDateString("2026-12-31").toISOString()).toBe("2026-12-31T00:00:00.000Z");
    expect(toDateString(fromDateString("2026-12-31"))).toBe("2026-12-31");
  });
});

describe("isValidDateString — 계산 기간 날짜 형식", () => {
  it("실제 존재하는 YYYY-MM-DD만 허용한다", () => {
    expect(isValidDateString("2026-09-30")).toBe(true);
    expect(isValidDateString("2028-02-29")).toBe(true);
    expect(isValidDateString("2026-02-30")).toBe(false);
    expect(isValidDateString("2026-9-30")).toBe(false);
    expect(isValidDateString("2026-09-31")).toBe(false);
    expect(isValidDateString("2026-09")).toBe(false);
  });
});
