import { apiClient } from "../../../shared/api/apiClient";
import type {
  ApiResponse,
  CreateTransactionRequest,
  CreateTransactionResult,
  TransactionItem,
  TransactionListData,
  TransactionListParams
} from "../model/transaction.types";

export const transactionApi = {
  getTransactions: async (
    params?: TransactionListParams
  ): Promise<ApiResponse<TransactionListData>> => {
    const res = await apiClient.get<ApiResponse<TransactionListData>>("/transactions", { params });
    return res.data;
  },

  getRecentTransactions: async (
    limit?: number
  ): Promise<ApiResponse<{ items: TransactionItem[] }>> => {
    const res = await apiClient.get<ApiResponse<{ items: TransactionItem[] }>>(
      "/transactions/recent",
      { params: limit ? { limit } : undefined }
    );
    return res.data;
  },

  getTransaction: async (id: number): Promise<ApiResponse<TransactionItem>> => {
    const res = await apiClient.get<ApiResponse<TransactionItem>>(`/transactions/${id}`);
    return res.data;
  },

  createTransaction: async (
    data: CreateTransactionRequest
  ): Promise<ApiResponse<CreateTransactionResult>> => {
    const res = await apiClient.post<ApiResponse<CreateTransactionResult>>("/transactions", data);
    return res.data;
  }
};
