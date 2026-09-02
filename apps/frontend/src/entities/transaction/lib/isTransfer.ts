import type { TransactionItem } from "../model/transaction.types";

// 계좌이동 전용 카테고리명. 백엔드에 transfer_group_id가 채워지기 전까지의 임시 판별 기준이며,
// #389(백엔드 API)가 모든 계좌이동 거래에 transfer_group_id를 채워주면 그 값만으로 판별하도록 정리한다.
const TRANSFER_CATEGORY_NAME = "계좌금액이동";

export function isTransferTransaction(
  tx: Pick<TransactionItem, "category_name" | "transfer_group_id">
): boolean {
  return !!tx.transfer_group_id || tx.category_name === TRANSFER_CATEGORY_NAME;
}
