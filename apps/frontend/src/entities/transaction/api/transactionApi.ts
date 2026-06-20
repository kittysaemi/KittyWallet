import { apiClient } from "../../../shared/api/apiClient";
import type {
  ApiResponse,
  CreateTransactionRequest,
  CreateTransactionResult,
  DeleteTransactionResult,
  TransactionDetailItem,
  TransactionItem,
  TransactionListData,
  TransactionListParams,
  UpdateTransactionRequest,
  UpdateTransactionResult
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

  getTransaction: async (id: number): Promise<ApiResponse<TransactionDetailItem>> => {
    const res = await apiClient.get<ApiResponse<TransactionDetailItem>>(`/transactions/${id}`);
    return res.data;
  },

  createTransaction: async (
    data: CreateTransactionRequest
  ): Promise<ApiResponse<CreateTransactionResult>> => {
    const res = await apiClient.post<ApiResponse<CreateTransactionResult>>("/transactions", data);
    return res.data;
  },

  updateTransaction: async (
    id: number,
    data: UpdateTransactionRequest
  ): Promise<ApiResponse<UpdateTransactionResult>> => {
    const res = await apiClient.put<ApiResponse<UpdateTransactionResult>>(
      `/transactions/${id}`,
      data
    );
    return res.data;
  },

  deleteTransaction: async (id: number): Promise<ApiResponse<DeleteTransactionResult>> => {
    const res = await apiClient.delete<ApiResponse<DeleteTransactionResult>>(
      `/transactions/${id}`
    );
    return res.data;
  }
};
