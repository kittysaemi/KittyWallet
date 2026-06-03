import { apiClient } from "../../../shared/api/apiClient";
import type {
  ApiResponse,
  CardItem,
  CardListData,
  CreateCardRequest,
  UpdateCardRequest
} from "../model/card.types";

export const cardApi = {
  getCards: async (params?: { use_yn?: boolean }): Promise<ApiResponse<CardListData>> => {
    const res = await apiClient.get<ApiResponse<CardListData>>("/cards", { params });
    return res.data;
  },

  createCard: async (data: CreateCardRequest): Promise<ApiResponse<{ card_id: number }>> => {
    const res = await apiClient.post<ApiResponse<{ card_id: number }>>("/cards", data);
    return res.data;
  },

  updateCard: async (
    cardId: number,
    data: UpdateCardRequest
  ): Promise<ApiResponse<Pick<CardItem, "card_id" | "use_yn">>> => {
    const res = await apiClient.put<ApiResponse<Pick<CardItem, "card_id" | "use_yn">>>(
      `/cards/${cardId}`,
      data
    );
    return res.data;
  }
};
