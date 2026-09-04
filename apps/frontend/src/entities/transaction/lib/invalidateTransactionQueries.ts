import type { QueryClient } from "@tanstack/react-query";

/**
 * 거래(단건/계좌이동) 생성·수정·삭제 후 관련된 모든 화면의 TanStack Query 캐시를 무효화한다.
 *
 * 계좌이동(짝) 거래를 삭제하면 실제로는 출금/입금 두 거래가 함께 삭제되는데,
 * 이전에는 ["transactions"] 계열만 무효화하고 지갑별 거래내역 화면이 쓰는
 * ["wallet-tx", ...] 쿼리는 빠져 있어 삭제된 짝 거래가 화면(지갑 거래내역 목록)에
 * 그대로 남아있는 문제가 있었다. (#353 진행 중 요청 3번)
 *
 * 거래 관련 mutation의 onSuccess에서 이 함수를 공통으로 호출해 특정 화면의
 * 캐시 무효화가 누락되는 것을 방지한다.
 */
export function invalidateTransactionRelatedQueries(queryClient: QueryClient): void {
  // 거래내역 화면(월별 목록) 및 스크롤 위치 계산
  void queryClient.invalidateQueries({ queryKey: ["transactions"] });
  void queryClient.invalidateQueries({ queryKey: ["transactions-position"] });
  // 지갑별(계좌/카드) 거래내역 화면 — WalletTransactionsPage
  void queryClient.invalidateQueries({ queryKey: ["wallet-tx"] });
  // 거래 상세 화면(단건) / 계좌이동 상세
  void queryClient.invalidateQueries({ queryKey: ["transaction"] });
  void queryClient.invalidateQueries({ queryKey: ["transfer"] });
  // 잔액/요약 등 파생 데이터
  void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  void queryClient.invalidateQueries({ queryKey: ["accounts"] });
  void queryClient.invalidateQueries({ queryKey: ["cards"] });
  void queryClient.invalidateQueries({ queryKey: ["statistics"] });
}
