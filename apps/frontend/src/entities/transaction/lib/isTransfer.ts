import type { TransactionItem } from "../model/transaction.types";

// 계좌이동 전용 카테고리명. 백엔드에 transfer_group_id가 채워지기 전까지의 임시 판별 기준이며,
// #389(백엔드 API)가 모든 계좌이동 거래에 transfer_group_id를 채워주면 그 값만으로 판별하도록 정리한다.
export const TRANSFER_CATEGORY_NAME = "계좌금액이동";

// 계좌이동 아이콘은 유저별로 소유/커스터마이징되는 "계좌금액이동" 카테고리의 icon_id를 따라가지 않고
// 고정한다(#409). 카테고리는 유저가 비활성화(show: false)하거나 아이콘을 바꿀 수 있어, 그 상태에
// 표시가 좌우되면 계정마다 아이콘이 다르게 보이거나 사라질 수 있기 때문이다. 백엔드가 이 카테고리를
// 최초 생성할 때 쓰는 기본 아이콘(transfer.repository.ts의 TRANSFER_CATEGORY_ICON_PROVIDER_KEY)과 동일한 값이다.
export const TRANSFER_ICON = {
  providerType: "lucide",
  providerKey: "repeat"
} as const;

export function isTransferTransaction(
  tx: Pick<TransactionItem, "category_name" | "transfer_group_id">
): boolean {
  return !!tx.transfer_group_id || tx.category_name === TRANSFER_CATEGORY_NAME;
}
