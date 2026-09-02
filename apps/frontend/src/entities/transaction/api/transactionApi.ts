import { apiClient } from "../../../shared/api/apiClient";
import type {
  ApiResponse,
  ConvertToInstallmentRequest,
  CreateTransactionRequest,
  CreateTransactionResult,
  CreateTransferRequest,
  DeleteTransactionResult,
  TransactionDetailItem,
  TransactionItem,
  TransactionListData,
  TransactionListParams,
  TransferResult,
  UpdateTransactionRequest,
  UpdateTransactionResult,
  UpdateTransferRequest
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
  },

  convertToInstallment: async (
    id: number,
    data: ConvertToInstallmentRequest
  ): Promise<ApiResponse<CreateTransactionResult>> => {
    const res = await apiClient.post<ApiResponse<CreateTransactionResult>>(
      `/transactions/${id}/convert-to-installment`,
      data
    );
    return res.data;
  },

  // 계좌이동 — 백엔드 API(#389)와 합의된 스펙. 백엔드 미구현 시 요청은 실패한다.
  createTransfer: async (
    data: CreateTransferRequest
  ): Promise<ApiResponse<TransferResult>> => {
    const res = await apiClient.post<ApiResponse<TransferResult>>("/transactions/transfer", data);
    return res.data;
  },

  updateTransfer: async (
    transferGroupId: string,
    data: UpdateTransferRequest
  ): Promise<ApiResponse<TransferResult>> => {
    const res = await apiClient.patch<ApiResponse<TransferResult>>(
      `/transactions/transfer/${transferGroupId}`,
      data
    );
    return res.data;
  },

  deleteTransfer: async (transferGroupId: string): Promise<ApiResponse<null>> => {
    const res = await apiClient.delete<ApiResponse<null>>(`/transactions/transfer/${transferGroupId}`);
    return res.data;
  }
};
