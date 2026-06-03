import type { ApiResponse } from "../../icon/model/icon.types";

export interface CardItem {
  card_id: number;
  card_name: string;
  icon_id: number;
  use_yn: boolean;
  created_at: string;
  updated_at: string;
}

export interface CardListData {
  items: CardItem[];
}

export interface CreateCardRequest {
  card_name: string;
  icon_id: number;
  use_yn?: boolean;
}

export interface UpdateCardRequest {
  card_name?: string;
  icon_id?: number;
  use_yn?: boolean;
}

export type { ApiResponse };
