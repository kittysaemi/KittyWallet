import { apiClient } from "../../../shared/api/apiClient";
import type {
  ApiResponse,
  FavoriteTransactionListData,
  SaveFavoriteTransactionRequest,
  SaveFavoriteTransactionResult
} from "../model/favoriteTransaction.types";

export const FAVORITE_TRANSACTIONS_QUERY_KEY = ["favorite-transactions"] as const;

export const favoriteTransactionApi = {
  getFavoriteTransactions: async (): Promise<ApiResponse<FavoriteTransactionListData>> => {
    const res = await apiClient.get<ApiResponse<FavoriteTransactionListData>>(
      "/favorite-transactions"
    );
    return res.data;
  },

  createFavoriteTransaction: async (
    data: SaveFavoriteTransactionRequest
  ): Promise<ApiResponse<SaveFavoriteTransactionResult>> => {
    const res = await apiClient.post<ApiResponse<SaveFavoriteTransactionResult>>(
      "/favorite-transactions",
      data
    );
    return res.data;
  },

  updateFavoriteTransaction: async (
    id: number,
    data: SaveFavoriteTransactionRequest
  ): Promise<ApiResponse<SaveFavoriteTransactionResult>> => {
    const res = await apiClient.put<ApiResponse<SaveFavoriteTransactionResult>>(
      `/favorite-transactions/${id}`,
      data
    );
    return res.data;
  },

  deleteFavoriteTransaction: async (
    id: number
  ): Promise<ApiResponse<{ favorite_transaction_id: number }>> => {
    const res = await apiClient.delete<ApiResponse<{ favorite_transaction_id: number }>>(
      `/favorite-transactions/${id}`
    );
    return res.data;
  }
};
