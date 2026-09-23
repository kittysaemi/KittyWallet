import { apiClient } from "../../../shared/api/apiClient";
import { QUERY_LIMIT } from "../../../shared/constants/queryConfig";
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

  /**
   * 조건에 맞는 거래를 건수 제한 없이 모두 조회한다(#353).
   * API는 1회 요청당 최대 100건만 반환하므로, total_count에 도달할 때까지 페이지를 이어 받아 합친다.
   * 한 페이지라도 실패하면 그 응답을 그대로 반환한다.
   */
  getAllTransactions: async (
    params?: Omit<TransactionListParams, "page" | "limit">
  ): Promise<ApiResponse<TransactionListData>> => {
    const limit = QUERY_LIMIT.TRANSACTION_API_MAX;
    const items: TransactionItem[] = [];
    let first: ApiResponse<TransactionListData> | null = null;
    for (let page = 1; ; page += 1) {
      const res = await transactionApi.getTransactions({ ...params, page, limit });
      if (!res.success || !res.data) return res;
      first ??= res;
      items.push(...res.data.items);
      if (res.data.items.length < limit || items.length >= res.data.total_count) break;
    }
    return {
      ...first,
      data: { ...first.data!, items, page: 1, limit: items.length, total_count: items.length }
    };
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
  getTransfer: async (transferGroupId: string): Promise<ApiResponse<TransferResult>> => {
    const res = await apiClient.get<ApiResponse<TransferResult>>(
      `/transactions/transfer/${transferGroupId}`
    );
    return res.data;
  },

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
