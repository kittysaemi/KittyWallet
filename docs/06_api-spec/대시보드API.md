# 문서 개요

## 문서 목적

본 문서는 미냥이 지갑 서비스의 대시보드 API 규격 및 처리 정책을 정의한다.

대시보드 API는 로그인 후 진입하는 메인 화면에서 필요한 사용자 정보, 자산 요약, 소비 요약, 최근 거래 내역, 동기화 상태를 한 번에 조회하기 위한 기준 API이다.

프론트엔드, 백엔드, 모바일(PWA) 개발 시 공통 기준 문서로 사용한다.

## 적용 범위

- 모바일 웹(PWA)
- 하이브리드 앱
- REST API 서버
- 대시보드 화면
- 최근 거래 요약
- 자산 요약
- 소비 요약
- 오프라인 캐시 표시
- 동기화 상태 표시

## 관련 문서

- 화면정의.md
- 상태관리.md
- 라우팅정의.md
- 사용자API.md
- 거래API.md
- 계좌API.md
- 카드API.md
- 통계API.md
- 동기화API.md
- 공통응답규격.md
- 오류코드정의.md

---

# 기본 정보

| 항목 | 내용 |
|---|---|
| Base URL | /api/v1 |
| 데이터 형식 | JSON |
| 인증 방식 | JWT Bearer |
| 응답 인코딩 | UTF-8 |
| 시간 저장 기준 | UTC |
| 삭제 거래 처리 | deleted_yn = false 데이터만 집계 |
| 오프라인 지원 | 최근 조회 데이터 캐시 지원 |

---

# 대시보드 API

## 대시보드 정책 요약

- 인증 사용자만 조회할 수 있다.
- 사용자별 데이터만 조회한다.
- 삭제 처리된 거래는 최근 거래, 자산 요약, 소비 요약에서 제외한다.
- 계좌 자산은 사용 여부와 관계없이 현재 보유 금액 기준으로 계산할 수 있다.
- 카드 거래는 자산 합계에는 직접 반영하지 않고 소비 요약 및 최근 거래에 반영한다.
- 최근 거래는 최신 거래일 기준으로 제한된 개수만 반환한다.
- 대시보드는 여러 화면 데이터를 과도하게 분리 호출하지 않도록 요약 데이터를 함께 반환한다.
- 오프라인 상태에서는 마지막 성공 응답을 캐시 데이터로 표시할 수 있다.
- 동기화 실패 또는 대기 상태가 있으면 대시보드에 상태 표시가 가능해야 한다.

---

# 대시보드 조회 API

## 목적

메인 대시보드 화면에 필요한 사용자 정보, 자산 요약, 소비 요약, 최근 거래 내역, 동기화 상태를 조회한다.

## Endpoint

`GET /api/v1/dashboard`

## Method

`GET`

## 인증

필수

```http
Authorization: Bearer {access_token}
```

---

## Query Parameters

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| recent_limit | number | N | 5 | 최근 거래 반환 개수 |
| summary_period | string | N | MONTH | 소비 요약 기간. MONTH/WEEK/TODAY |
| base_date | string | N | 서버 기준 현재일 | 요약 기준일. YYYY-MM-DD |

---

## Request Example

```http
GET /api/v1/dashboard?recent_limit=5&summary_period=MONTH&base_date=2026-05-30
Authorization: Bearer {access_token}
```

---

## Response

```json
{
  "success": true,
  "data": {
    "user": {
      "user_id": 1,
      "nickname": "미냥이"
    },
    "asset_summary": {
      "total_asset_amount": 1250000,
      "account_count": 3,
      "active_account_count": 2,
      "card_count": 2,
      "active_card_count": 1,
      "currency": "KRW"
    },
    "spending_summary": {
      "period_type": "MONTH",
      "start_date": "2026-05-01",
      "end_date": "2026-05-30",
      "income_amount": 2500000,
      "expense_amount": 850000,
      "net_amount": 1650000,
      "transaction_count": 42
    },
    "recent_transactions": [
      {
        "transaction_id": 100,
        "wallet_type": "ACCOUNT",
        "wallet_id": 1,
        "wallet_name": "생활비 통장",
        "wallet_deleted": false,
        "category_id": 3,
        "category_name": "식비",
        "transaction_type": "EXPENSE",
        "amount": 15000,
        "memo": "점심 식사",
        "transaction_date": "2026-05-29",
        "created_at": "2026-05-29T03:20:00Z",
        "updated_at": "2026-05-29T03:20:00Z"
      }
    ],
    "sync_summary": {
      "has_pending_sync": false,
      "pending_count": 0,
      "failed_count": 0,
      "last_synced_at": "2026-05-30T01:00:00Z"
    },
    "cache_policy": {
      "cacheable": true,
      "recommended_stale_time_seconds": 60
    }
  },
  "error": null
}
```

---

## Response 필드 정의

### user

| 필드 | 타입 | 설명 |
|---|---|---|
| user_id | number | 사용자 ID |
| nickname | string | 사용자 닉네임 |

### asset_summary

| 필드 | 타입 | 설명 |
|---|---|---|
| total_asset_amount | number | 전체 계좌 현재 잔액 합계 |
| account_count | number | 등록 계좌 수 |
| active_account_count | number | 사용 중 계좌 수 |
| card_count | number | 등록 카드 수 |
| active_card_count | number | 사용 중 카드 수 |
| currency | string | 통화 코드 |

### spending_summary

| 필드 | 타입 | 설명 |
|---|---|---|
| period_type | string | 요약 기간 유형 |
| start_date | string | 요약 시작일 |
| end_date | string | 요약 종료일 |
| income_amount | number | 기간 내 수입 합계 |
| expense_amount | number | 기간 내 지출 합계 |
| net_amount | number | 수입 - 지출 |
| transaction_count | number | 기간 내 거래 건수 |

### recent_transactions

| 필드 | 타입 | 설명 |
|---|---|---|
| transaction_id | number | 거래 ID |
| wallet_type | string | ACCOUNT/CARD |
| wallet_id | number | 계좌 또는 카드 ID |
| wallet_name | string | 계좌명 또는 카드명 |
| wallet_deleted | boolean | 지갑 아카이브 여부. true면 수정 불가, 삭제만 가능 |
| category_id | number | 카테고리 ID |
| category_name | string | 카테고리명 |
| transaction_type | string | INCOME/EXPENSE |
| amount | number | 거래 금액 |
| memo | string | 메모 |
| transaction_date | string | 거래일 |
| created_at | string | 생성일시 |
| updated_at | string | 수정일시 |

### sync_summary

> **주의**: `has_pending_sync`, `pending_count`, `failed_count`는 서버가 로컬 IndexedDB Queue 상태를 알 수 없으므로 서버 응답에서 제공하지 않는다. 프론트에서 로컬 `sync_queue` IndexedDB를 조회하여 합성한다. `last_synced_at`은 서버의 `SYNC_CLIENT.last_synced_at` 기준으로 제공한다.

| 필드 | 타입 | 출처 | 설명 |
|---|---|---|---|
| has_pending_sync | boolean | 프론트 로컬 | 로컬 sync_queue의 waiting/failed 항목 존재 여부 |
| pending_count | number | 프론트 로컬 | 로컬 sync_queue의 waiting 건수 |
| failed_count | number | 프론트 로컬 | 로컬 sync_queue의 failed 건수 |
| last_synced_at | string/null | 서버 응답 | 서버 SYNC_CLIENT.last_synced_at 기준 |

### cache_policy

| 필드 | 타입 | 설명 |
|---|---|---|
| cacheable | boolean | 프론트 캐시 가능 여부 |
| recommended_stale_time_seconds | number | 권장 캐시 유효 시간 |

---

## 비즈니스 규칙

| 항목 | 처리 규칙 |
|---|---|
| 인증 | 유효한 Access Token이 있어야 조회 가능 |
| 사용자 범위 | 로그인 사용자 데이터만 조회 |
| 삭제 거래 | deleted_yn = true 거래는 제외 |
| 최근 거래 | 거래일 내림차순, 생성일시 내림차순 기준 |
| recent_limit | 1 이상 20 이하만 허용 |
| summary_period | TODAY/WEEK/MONTH만 허용 |
| base_date | 미래 날짜 허용. 단 조회 기준일로만 사용 |
| 계좌 잔액 | ACCOUNT.current_balance 기준 합산 |
| 카드 거래 | 자산 합계 제외, 소비 요약 포함 |
| 통계 기준 | 거래 데이터 기준 실시간 산출 |
| 오프라인 캐시 | 마지막 성공 응답을 Workbox Runtime Cache(Cache Storage)에 저장한다. IndexedDB에는 저장하지 않는다 |

---

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 400 | DASHBOARD_001 | 잘못된 조회 조건 |
| 401 | AUTH_002 | 인증 실패 또는 토큰 만료 |
| 500 | DASHBOARD_002 | 대시보드 조회 실패 |
| 500 | STAT_001 | 소비 요약 조회 실패 |
| 500 | SYNC_001 | 동기화 상태 조회 실패 |

---

## 프론트 처리 주의사항

- `/dashboard` 라우트 진입 시 호출한다.
- 대시보드는 Server State로 관리하며 TanStack Query 사용을 권장한다.
- 전체 화면 로딩보다 카드별 Skeleton UI를 우선 사용한다.
- 최근 거래가 없으면 최근 거래 영역만 Empty 상태로 표시한다.
- API 실패 시 전체 화면을 막지 말고 재시도 UI를 제공한다.
- 오프라인 상태에서는 마지막 성공 응답 캐시를 표시하고 Offline Banner를 함께 표시한다.
- `sync_summary.failed_count`가 1 이상이면 동기화 실패 상태를 사용자에게 표시한다.
- 로그아웃은 대시보드 API가 아니라 `POST /api/v1/auth/logout` API를 사용한다.
- 최근 거래 항목 클릭 시 `/transactions/{transaction_id}` 상세 화면으로 이동한다.

---

# 최근 거래 요약 조회 API

## 목적

대시보드 최근 거래 영역만 별도 갱신할 때 사용한다.

대시보드 전체를 다시 조회하지 않고 최근 거래 목록만 갱신해야 하는 경우에 사용한다.

## Endpoint

`GET /api/v1/transactions/recent`

## Method

`GET`

## 인증

필수

```http
Authorization: Bearer {access_token}
```

---

## Query Parameters

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| limit | number | N | 5 | 최근 거래 반환 개수 |

---

## Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "transaction_id": 100,
        "wallet_type": "ACCOUNT",
        "wallet_id": 1,
        "wallet_name": "생활비 통장",
        "wallet_deleted": false,
        "category_id": 3,
        "category_name": "식비",
        "transaction_type": "EXPENSE",
        "amount": 15000,
        "memo": "점심 식사",
        "transaction_date": "2026-05-29",
        "created_at": "2026-05-29T03:20:00Z",
        "updated_at": "2026-05-29T03:20:00Z"
      }
    ]
  },
  "error": null
}
```

---

## 비즈니스 규칙

| 항목 | 처리 규칙 |
|---|---|
| 인증 | 유효한 Access Token 필요 |
| 사용자 범위 | 로그인 사용자 거래만 조회 |
| 삭제 거래 | deleted_yn = true 거래 제외 |
| 정렬 | 거래일 내림차순, 생성일시 내림차순 |
| limit | 1 이상 20 이하만 허용 |

---

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 400 | DASHBOARD_001 | 잘못된 조회 조건 |
| 401 | AUTH_002 | 인증 실패 또는 토큰 만료 |
| 500 | DASHBOARD_003 | 최근 거래 조회 실패 |

---

# 캐싱 및 오프라인 정책

## 캐싱 대상

| 데이터 | 캐싱 여부 | 설명 |
|---|---|---|
| 대시보드 전체 응답 | Y | 오프라인 화면 표시용 |
| 최근 거래 목록 | Y | 최근 조회 데이터 표시용 |
| 사용자 닉네임 | Y | 사용자 카드 표시용 |
| 동기화 상태 | N | 최신 상태 우선 |

## 캐싱 기준

- 마지막 성공 응답만 저장한다.
- 사용자별 캐시를 분리한다.
- 로그아웃 시 대시보드 캐시를 삭제한다.
- 오프라인 상태에서는 캐시 데이터임을 화면에 표시한다.
- 온라인 복구 시 background refetch를 수행한다.

---

# 상태 정의

상태 소유자와 복구 액션의 canonical 기준은 `docs/03_screen-spec/상태정의.md`를 따른다. 대시보드 API 문서는 대시보드 화면에서 사용하는 상태만 요약한다.

| 상태 | 설명 | 처리 |
|---|---|---|
| loading | 최초 조회 중 | Skeleton UI 표시 |
| refreshing | 재조회 중 | 기존 데이터 유지 후 부분 로딩 표시 |
| empty | 최근 거래 없음 | 최근 거래 Empty 상태 표시 |
| error | 조회 실패 | 재시도 버튼 표시 |
| offline | 네트워크 미연결 | 캐시 데이터 표시 및 Offline Banner 노출 |
| expired | 인증 만료 | 로그인 화면 이동 |
| syncing | 동기화 진행 중 | 동기화 상태 배지 표시 |
| sync_failed | 동기화 실패 | 동기화 실패 배너 및 재시도 표시 |

---

# 구현 참고 구조

```text
src/
  pages/
    dashboard/
      DashboardPage.tsx
  entities/
    dashboard/
      api/
        dashboardApi.ts
      model/
        dashboardTypes.ts
      hooks/
        useDashboardQuery.ts
  shared/
    storage/
      dashboardCache.ts
```

---

# 구현 시 주의사항

- 대시보드 API는 화면 표시용 요약 API이므로 등록, 수정, 삭제 기능을 포함하지 않는다.
- 거래 저장, 수정, 삭제는 거래 API를 사용한다.
- 계좌/카드 등록 및 수정은 각 도메인 API를 사용한다.
- 통계 상세 화면은 통계 API를 사용한다.
- 대시보드 소비 요약은 통계 화면의 상세 차트 데이터를 대체하지 않는다.
- 응답 데이터는 화면 표시 목적에 맞게 가볍게 유지한다.
- 최근 거래 상세 정보가 많이 필요한 경우 거래 상세 API를 별도로 호출한다.
