/**
 * TanStack Query 공통 설정 상수
 *
 * STALE_TIME : 데이터를 fresh로 간주하는 시간 (ms)
 * GC_TIME    : 캐시에서 제거하기까지 대기 시간 (ms)
 * RETRY      : 네트워크 재시도 횟수 (오프라인일 때는 호출부에서 false 처리)
 * QUERY_LIMIT: API 요청 시 한 번에 가져오는 최대 항목 수
 */

export const STALE_TIME = {
  /** 항상 최신 데이터 필요 (대시보드, 관리 페이지) */
  REALTIME: 0,
  /** 거래내역·통계 — 30초 */
  SHORT: 30_000,
  /** 계좌·카드 잔액, 검색 결과 — 1분 */
  MINUTE: 60_000,
  /** 설정·계좌/카드 목록 — 5분 */
  MEDIUM: 5 * 60_000,
  /** 카테고리·아이콘 — 10분 */
  LONG: 10 * 60_000,
} as const;

export const GC_TIME = {
  /** 기본 가비지 컬렉션 시간 — 10분 */
  DEFAULT: 10 * 60_000,
} as const;

export const RETRY = {
  /** 일반 쿼리 재시도 횟수 */
  STANDARD: 2,
  /** 중요 데이터 재시도 횟수 */
  AGGRESSIVE: 3,
} as const;

export const QUERY_LIMIT = {
  /** 거래내역 목록 페이징 */
  PAGE: 20,
  /** 통계 Top5 */
  TOP5: 5,
  /** 대시보드 "최근 내역" — 계좌이동 제외 후에도 항상 6개가 채워지도록 백엔드가 쿼리 단계에서 계좌이동을 걸러내고 이 개수만큼 반환한다 */
  DASHBOARD_RECENT: 6,
  /** 거래 검색(조회·키워드) — 결과를 스크롤 시 이 개수씩 이어서 불러온다 */
  SEARCH_PAGE: 50,
  /** 거래 목록 API(GET /transactions)의 1회 요청 최대 limit. 전체 조회는 이 크기로 페이지를 이어 받는다 */
  TRANSACTION_API_MAX: 100,
} as const;
