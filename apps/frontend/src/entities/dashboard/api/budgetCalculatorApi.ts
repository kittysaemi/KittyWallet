import { apiClient } from "../../../shared/api/apiClient";
import type { ApiResponse } from "../model/dashboard.types";
import type { BudgetCalculatorSource } from "../model/budgetCalculator.types";

// 예산 계산기 원본 조회. 입력값·결과는 요청에 넣지 않는다(계산 기간의 시작일·종료일만 전달).
export const budgetCalculatorApi = {
  getSource: async (
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<BudgetCalculatorSource>> => {
    const res = await apiClient.get<ApiResponse<BudgetCalculatorSource>>(
      "/dashboard/budget-calculator-source",
      { params: { start_date: startDate, end_date: endDate } }
    );
    return res.data;
  }
};
