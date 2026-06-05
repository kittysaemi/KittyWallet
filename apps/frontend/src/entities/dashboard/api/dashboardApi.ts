import { apiClient } from "../../../shared/api/apiClient";
import type { ApiResponse, DashboardData, DashboardQuery } from "../model/dashboard.types";

export const dashboardApi = {
  getDashboard: async (params?: DashboardQuery): Promise<ApiResponse<DashboardData>> => {
    const res = await apiClient.get<ApiResponse<DashboardData>>("/dashboard", { params });
    return res.data;
  }
};
