import { apiClient } from "../../../shared/api/apiClient";
import type {
  AccountItem,
  AccountListData,
  ApiResponse,
  CreateAccountRequest,
  UpdateAccountRequest
} from "../model/account.types";

export const accountApi = {
  getAccounts: async (params?: {
    use_yn?: boolean;
    include_balance?: boolean;
  }): Promise<ApiResponse<AccountListData>> => {
    const res = await apiClient.get<ApiResponse<AccountListData>>("/accounts", { params });
    return res.data;
  },

  createAccount: async (
    data: CreateAccountRequest
  ): Promise<ApiResponse<{ account_id: number }>> => {
    const res = await apiClient.post<ApiResponse<{ account_id: number }>>("/accounts", data);
    return res.data;
  },

  updateAccount: async (
    accountId: number,
    data: UpdateAccountRequest
  ): Promise<ApiResponse<Pick<AccountItem, "account_id" | "use_yn">>> => {
    const res = await apiClient.put<ApiResponse<Pick<AccountItem, "account_id" | "use_yn">>>(
      `/accounts/${accountId}`,
      data
    );
    return res.data;
  }
};
