import { apiClient } from "../../../shared/api/apiClient";
import type {
  AccountListData,
  ApiResponse,
  CreateAccountRequest,
  UpdateAccountRequest
} from "../model/account.types";

export const accountApi = {
  getAccounts: async (params?: {
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
  ): Promise<ApiResponse<{ account_id: number }>> => {
    const res = await apiClient.put<ApiResponse<{ account_id: number }>>(
      `/accounts/${accountId}`,
      data
    );
    return res.data;
  },

  deleteAccount: async (
    accountId: number,
    deleteTransactions: boolean
  ): Promise<ApiResponse<null>> => {
    const res = await apiClient.delete<ApiResponse<null>>(`/accounts/${accountId}`, {
      data: { delete_transactions: deleteTransactions }
    });
    return res.data;
  }
};
