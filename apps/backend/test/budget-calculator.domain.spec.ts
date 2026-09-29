import {
  BUDGET_CALCULATOR_ENV_KEYS,
  BudgetCalculatorConfig,
  loadBudgetCalculatorConfig
} from "../src/modules/dashboard/domain/budget-calculator-config";
import { calcBudgetPeriods, toDateString } from "../src/modules/dashboard/domain/budget-period";
import {
  classifyRecurringGroup,
  classifyRecurringTransactions,
  RecurringSourceTransaction
} from "../src/modules/dashboard/domain/recurring-expense.classifier";

const config: BudgetCalculatorConfig = {
  observationMonths: 6,
  automaticMinOccurrences: 3,
  candidateMinOccurrences: 2,
  intervalTolerancePercent: 20,
  intervalToleranceMinDays: 3,
  amountTolerancePercent: 20,
  candidateRecentMonths: 3
};

// 기준 월 2026-09 → 다음 달 2026-10, 후보 표시 기간 2026-07-01부터
const window = {
  nextStartDate: new Date("2026-10-01T00:00:00.000Z"),
  nextEndDate: new Date("2026-10-31T00:00:00.000Z"),
  candidateRecentStartDate: new Date("2026-07-01T00:00:00.000Z"),
  observationMonths: 6
};

let idSeq = 1n;
function tx(
  date: string,
  amount: number,
  overrides: Partial<RecurringSourceTransaction> = {}
): RecurringSourceTransaction {
  idSeq += 1n;
  return {
    transactionId: idSeq,
    walletType: "ACCOUNT",
    walletId: 1n,
    categoryId: 10n,
    categoryName: "주거",
    memo: "월세",
    transactionDate: new Date(`${date}T00:00:00.000Z`),
    amount,
    ...overrides
  };
}

describe("loadBudgetCalculatorConfig — 기준값은 환경변수로만 받는다", () => {
  const validEnv: Record<string, string> = {
    [BUDGET_CALCULATOR_ENV_KEYS.observationMonths]: "6",
    [BUDGET_CALCULATOR_ENV_KEYS.automaticMinOccurrences]: "3",
    [BUDGET_CALCULATOR_ENV_KEYS.candidateMinOccurrences]: "2",
    [BUDGET_CALCULATOR_ENV_KEYS.intervalTolerancePercent]: "20",
    [BUDGET_CALCULATOR_ENV_KEYS.intervalToleranceMinDays]: "3",
    [BUDGET_CALCULATOR_ENV_KEYS.amountTolerancePercent]: "20",
    [BUDGET_CALCULATOR_ENV_KEYS.candidateRecentMonths]: "3"
  };

  it("모든 값이 있으면 숫자로 읽는다", () => {
    expect(loadBudgetCalculatorConfig((key) => validEnv[key])).toEqual(config);
  });

  it("값이 없으면 기본값 없이 오류를 낸다", () => {
    const env = { ...validEnv };
    delete env[BUDGET_CALCULATOR_ENV_KEYS.observationMonths];
    expect(() => loadBudgetCalculatorConfig((key) => env[key])).toThrow(
      BUDGET_CALCULATOR_ENV_KEYS.observationMonths
    );
  });

  it("정수가 아니거나 자동 반영 횟수가 후보 횟수보다 작으면 오류를 낸다", () => {
    expect(() =>
      loadBudgetCalculatorConfig((key) =>
        key === BUDGET_CALCULATOR_ENV_KEYS.amountTolerancePercent ? "abc" : validEnv[key]
      )
    ).toThrow(BUDGET_CALCULATOR_ENV_KEYS.amountTolerancePercent);
    expect(() =>
      loadBudgetCalculatorConfig((key) =>
        key === BUDGET_CALCULATOR_ENV_KEYS.automaticMinOccurrences ? "1" : validEnv[key]
      )
    ).toThrow(BUDGET_CALCULATOR_ENV_KEYS.automaticMinOccurrences);
  });
});

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
    const periods = calcBudgetPeriods("2026-12", 6, 3);
    expect(toDateString(periods.base.startDate)).toBe("2026-12-01");
    expect(toDateString(periods.base.endDate)).toBe("2026-12-31");
    expect(periods.next).toMatchObject({ year: 2027, month: 1 });
    expect(toDateString(periods.next.endDate)).toBe("2027-01-31");
  });

  it("윤년 2월의 말일은 29일이다", () => {
    const periods = calcBudgetPeriods("2028-01", 6, 3);
    expect(toDateString(periods.next.endDate)).toBe("2028-02-29");
    expect(toDateString(calcBudgetPeriods("2027-02", 6, 3).base.endDate)).toBe("2027-02-28");
  });

  it("관찰 구간은 기준 월 직전 N개 완료 월, 후보 기간은 기준 월 포함 최근 N개월이다", () => {
    const periods = calcBudgetPeriods("2026-02", 6, 3);
    expect(toDateString(periods.observationStartDate)).toBe("2025-08-01");
    expect(toDateString(periods.candidateRecentStartDate)).toBe("2025-12-01");
  });
});

describe("classifyRecurringGroup — 반복 판별", () => {
  it("매달 같은 금액이면 AUTOMATIC이며 가장 최근 금액을 쓴다(평균 아님)", () => {
    const result = classifyRecurringGroup(
      [tx("2026-06-25", 500000), tx("2026-07-25", 500000), tx("2026-08-25", 550000)],
      config,
      window
    );
    expect(result).toMatchObject({ classification: "AUTOMATIC", amount: 550000, nextPeriodCount: 1 });
  });

  it("기준 월 거래가 아직 없어도 예정일을 이어 계산해 다음 달에 반영한다", () => {
    // 8/25 이후 9/25(기준 월)을 거쳐 10/25(다음 달)가 예정일이다.
    const result = classifyRecurringGroup(
      [tx("2026-06-25", 500000), tx("2026-07-25", 500000), tx("2026-08-25", 500000)],
      config,
      window
    );
    expect(result?.nextPeriodCount).toBe(1);
  });

  it("4주 주기는 달력 월이 아니라 간격으로 판별하고 다음 달 예정 횟수만큼 반영한다", () => {
    const result = classifyRecurringGroup(
      [tx("2026-06-02", 10000), tx("2026-06-30", 10000), tx("2026-07-28", 10000), tx("2026-08-25", 10000)],
      config,
      window
    );
    // 8/25 + 28일 → 9/22, 10/20 → 다음 달 1회
    expect(result).toMatchObject({ classification: "AUTOMATIC", medianIntervalDays: 28, amount: 10000 });
  });

  it("6주 주기에서 다음 달 예정일이 없으면 반영하지 않는다", () => {
    // 8/20 + 42일 → 10/1, + 84일 → 11/12 → 10월 1회
    expect(
      classifyRecurringGroup(
        [tx("2026-05-28", 30000), tx("2026-07-09", 30000), tx("2026-08-20", 30000)],
        config,
        window
      )?.nextPeriodCount
    ).toBe(1);
    // 8/10 + 42일 → 9/21, + 84일 → 11/2 → 10월 0회
    expect(
      classifyRecurringGroup(
        [tx("2026-05-18", 30000), tx("2026-06-29", 30000), tx("2026-08-10", 30000)],
        config,
        window
      )
    ).toBeNull();
  });

  it("2회만 발생하면 간격과 무관하게 CANDIDATE다", () => {
    const result = classifyRecurringGroup([tx("2026-07-28", 35000), tx("2026-08-27", 35000)], config, window);
    expect(result).toMatchObject({ classification: "CANDIDATE", amount: 35000, reason: "반복 횟수 부족(2회)" });
  });

  it("3회 이상이어도 금액이 허용 오차를 넘으면 CANDIDATE다", () => {
    const result = classifyRecurringGroup(
      [tx("2026-06-10", 20000), tx("2026-07-10", 80000), tx("2026-08-10", 35000)],
      config,
      window
    );
    expect(result?.classification).toBe("CANDIDATE");
  });

  it("3회 이상이어도 간격이 허용 오차를 넘으면 CANDIDATE다", () => {
    const result = classifyRecurringGroup(
      [tx("2026-04-01", 10000), tx("2026-06-20", 10000), tx("2026-07-10", 10000), tx("2026-08-25", 10000)],
      config,
      window
    );
    expect(result?.classification).toBe("CANDIDATE");
  });

  it("한 번만 발생한 지출은 자동 반영·후보 모두 아니다", () => {
    expect(classifyRecurringGroup([tx("2026-08-10", 12000)], config, window)).toBeNull();
  });

  it("후보 표시 기간보다 오래전에 끝난 불규칙 지출은 후보로 표시하지 않는다", () => {
    expect(
      classifyRecurringGroup([tx("2026-04-01", 10000), tx("2026-05-01", 10000)], config, window)
    ).toBeNull();
  });

  it("같은 날 여러 번 기록돼 간격이 없으면 반복으로 보지 않는다", () => {
    expect(
      classifyRecurringGroup([tx("2026-08-10", 5000), tx("2026-08-10", 5000)], config, window)
    ).toBeNull();
  });

  it("카테고리명으로 분류하지 않는다(의료 카테고리도 규칙적이면 AUTOMATIC)", () => {
    const medical = { categoryName: "의료", memo: "정기 진료", categoryId: 20n };
    const result = classifyRecurringGroup(
      [tx("2026-06-15", 30000, medical), tx("2026-07-15", 30000, medical), tx("2026-08-15", 30000, medical)],
      config,
      window
    );
    expect(result?.classification).toBe("AUTOMATIC");
  });
});

describe("classifyRecurringTransactions — 정규화 키", () => {
  it("메모의 공백·대소문자만 다른 거래는 같은 반복 지출로 묶는다", () => {
    const results = classifyRecurringTransactions(
      [tx("2026-06-25", 9900, { memo: "Netflix" }), tx("2026-07-25", 9900, { memo: " netflix " }), tx("2026-08-25", 9900, { memo: "NETFLIX" })],
      config,
      window
    );
    expect(results).toHaveLength(1);
    expect(results[0].occurrences).toBe(3);
  });

  it("지갑이 다르면 같은 메모라도 합치지 않는다", () => {
    const results = classifyRecurringTransactions(
      [
        tx("2026-06-25", 9900, { walletId: 1n }),
        tx("2026-07-25", 9900, { walletId: 2n }),
        tx("2026-08-25", 9900, { walletId: 1n })
      ],
      config,
      window
    );
    expect(results.map((r) => [r.walletId, r.classification])).toEqual([[1n, "CANDIDATE"]]);
  });
});
