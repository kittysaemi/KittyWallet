# 문서 개요

## 문서 목적

본 문서는 미냥이 지갑 서비스의 API 규격 및 처리 정책을 정의한다.
프론트엔드, 백엔드, 모바일(PWA) 개발 시 공통 기준 문서로 사용한다.

## 적용 범위

- 모바일 웹(PWA)
- 하이브리드 앱
- REST API 서버
- 오프라인 동기화 처리
- 통계 및 잔액 처리

## 관련 문서

- 정책정의.md
- 상태정의.md
- 예외처리.md
- ERD.md
- 공통응답규격.md

---

# 기본 정보

| 항목 | 내용 |
|---|---|
| Base URL | /api/v1 |
| 데이터 형식 | JSON |
| 인증 방식 | JWT Bearer |
| 응답 인코딩 | UTF-8 |
| 시간 저장 기준 | UTC |
| 삭제 처리 | Soft Delete |
| 오프라인 지원 | 지원 |


# 거래 API

## 거래 정책 요약

- 미래 날짜 등록 불가 (사용자 timezone 기준 today 이후 차단)
- Soft Delete 적용
- 거래 저장 시 잔액 자동 계산
- 수정 시 기존 금액 복구 후 재계산
- 계좌 거래는 날짜별 잔액 흐름 기준으로 잔액 부족/마이너스 한도 초과 검증
- deleted_yn 기반 삭제 처리
- Offline First 구조 지원

---

# 거래 등록 API

## 목적

수입/지출 거래를 계좌 또는 카드 결제수단 기준으로 저장한다.

## Endpoint

`POST /api/v1/transactions`

---

## Request Body

```json
{
  "wallet_type": "ACCOUNT",
  "wallet_id": 1,
  "category_id": 3,
  "transaction_type": "EXPENSE",
  "amount": 15000,
  "memo": "점심 식사",
  "transaction_date": "2026-05-29"
}
```

---

## Request 필드 정의

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| wallet_type | string | Y | ACCOUNT/CARD |
| wallet_id | number | Y | `wallet_type=ACCOUNT`이면 account_id, `wallet_type=CARD`이면 card_id |
| category_id | number | Y | 카테고리 ID |
| transaction_type | string | Y | INCOME/EXPENSE |
| amount | number | Y | 거래 금액 |
| memo | string | N | 메모 |
| transaction_date | string | Y | 거래 날짜. 사용자 설정 timezone 기준 캘린더 날짜 `YYYY-MM-DD` |
| timezone | string | N | 미래 날짜 검증 기준 시간대. IANA 식별자 (예: `Asia/Seoul`). 미전달 시 `Asia/Seoul` 기본값 사용 |

---

## 비즈니스 규칙

| 항목 | 처리 규칙 |
|---|---|
| 미래 날짜 | 사용자 timezone 기준 today 이후 날짜 저장 불가 |
| 금액 0 이하 | 저장 불가 |
| 삭제 거래 | 통계 제외 |
| 계좌 수입 | `transaction_type=INCOME`, `wallet_type=ACCOUNT`, current_balance 증가 |
| 계좌 지출 | `transaction_type=EXPENSE`, `wallet_type=ACCOUNT`, current_balance 감소. 날짜별 잔액 흐름이 허용 범위 아래로 내려가면 저장 불가 (`ACCOUNT_004` 반환) |
| 잔액 음수 | 마이너스 미허용 계좌는 어느 날짜의 잔액도 0 미만 불가. 마이너스 허용 계좌는 `-negative_balance_limit` 미만 불가 |
| 카드 지출 | `transaction_type=EXPENSE`, `wallet_type=CARD`, 카드 내역 저장 및 지출 통계 반영 |
| 카드 수입 | `transaction_type=INCOME`, `wallet_type=CARD` 조합 저장 불가 |
| 결제수단 | 계좌/카드는 거래 유형이 아니라 `wallet_type`으로 표현 |

---

## Response

```json
{
  "success": true,
  "data": {
    "transaction_id": 100,
    "updated_at": "2026-05-29T03:20:00Z",
    "synced_at": "2026-05-29T03:20:00Z"
  },
  "error": null
}
```

> `updated_at`과 `synced_at`은 오프라인 생성 거래의 로컬 `server_id` 매핑 및 Sync Queue 정리 시 사용한다.

---

## 오류 처리

| 코드 | 설명 |
|---|---|
| TX_001 | 미래 날짜 등록 불가 |
| TX_002 | 금액 오류 |
| TX_003 | 존재하지 않는 계좌 |
| TX_004 | 존재하지 않는 카드 |
| TX_007 | 카드 수입 거래 저장 불가 |
| ACCOUNT_004 | 계좌 잔액 부족 또는 마이너스 한도 초과 |

---

## 오프라인 정책

- 거래 등록/수정/삭제 모두 로컬 저장 후 Sync Queue 처리
- 온라인 복구 시 자동 재전송
- updated_at 기준 충돌 처리
- 오프라인 저장은 로컬 Queue 기준 1차 잔액 검증을 수행하고, 서버 동기화 시 서버가 날짜별 잔액 흐름 기준으로 최종 검증한다.

| 상황 | Queue 처리 |
|---|---|
| 신규 거래 등록 | CREATE Queue 등록 |
| 서버 반영 전 거래 수정 | 기존 CREATE Queue payload 갱신 |
| 서버 반영 완료 거래 수정 | UPDATE Queue 등록 |
| 서버 반영 전 거래 삭제 | CREATE Queue 제거 및 로컬 데이터 삭제 |
| 서버 반영 완료 거래 삭제 | DELETE Queue 등록 및 로컬 deleted_yn 반영 |

삭제 우선순위:

1. DELETE Queue가 존재하는 거래는 추가 UPDATE Queue를 생성하지 않는다.
2. 서버에 아직 생성되지 않은 거래는 삭제 시 서버 동기화 대상에서 제외한다.
3. 서버 반영 완료 거래는 DELETE 동기화 시 Soft Delete로 처리한다.

---

## 프론트 처리 주의사항

- 등록 직후 낙관적 UI 처리 가능
- Sync 실패 상태 표시 필요
- 거래 삭제 시 목록 즉시 제거 금지

---

# 거래 수정 API

## 목적

기존 거래의 금액, 날짜, 카테고리, 결제수단, 메모를 수정한다.

거래 수정 시 기존 거래가 계좌 잔액에 반영한 금액을 먼저 복구한 뒤, 변경된 거래 기준으로 잔액과 통계를 다시 계산한다.

## Endpoint

`PUT /api/v1/transactions/{id}`

---

## Path Parameters

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| id | number | Y | 수정할 거래 ID |

---

## Request Body

```json
{
  "wallet_type": "ACCOUNT",
  "wallet_id": 1,
  "category_id": 3,
  "transaction_type": "EXPENSE",
  "amount": 18000,
  "memo": "점심 식사",
  "transaction_date": "2026-05-29"
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| wallet_type | string | N | ACCOUNT/CARD. 변경 시 `wallet_id`도 함께 검증 |
| wallet_id | number | N | `wallet_type=ACCOUNT`이면 account_id, `wallet_type=CARD`이면 card_id |
| category_id | number | N | 변경할 카테고리 ID |
| transaction_type | string | N | INCOME/EXPENSE |
| amount | number | N | 변경할 거래 금액. 0보다 커야 함 |
| memo | string/null | N | 변경할 메모. null 또는 빈 문자열 허용 |
| transaction_date | string | N | 변경할 거래 날짜. 사용자 설정 timezone 기준 캘린더 날짜 `YYYY-MM-DD` |
| timezone | string | N | 미래 날짜 검증 기준 시간대. IANA 식별자 (예: `Asia/Seoul`). 미전달 시 `Asia/Seoul` 기본값 사용 |

---

## 비즈니스 규칙

| 항목 | 처리 규칙 |
|---|---|
| 수정 대상 | 로그인 사용자의 deleted_yn=false 거래만 수정 가능 |
| 부분 수정 | 전달된 필드만 수정하되, 수정 가능한 필드가 하나 이상 필요 |
| 미래 날짜 | 사용자 timezone 기준 today 이후 날짜 저장 불가 |
| 금액 0 이하 | 저장 불가 |
| 계좌 거래 수정 | 기존 거래를 제거하고 변경 거래를 반영한 가상 상태로 날짜별 잔액 흐름을 검증. 허용 범위 아래로 내려가면 수정 불가 (`ACCOUNT_004` 반환) |
| 카드 거래 수정 | 카드 내역만 변경하며 계좌 잔액은 변경하지 않음 |
| 계좌/카드 변경 | 기존 반영분 복구 후 새 `wallet_type` 기준으로 처리 |
| 카드 수입 | `transaction_type=INCOME`, `wallet_type=CARD` 조합 저장 불가 |
| 비활성 결제수단 | `use_yn=false` 계좌/카드는 신규 선택 또는 변경 대상 불가 |
| 계좌 변경 | 기존 계좌와 새 계좌의 날짜별 잔액 흐름을 모두 검증 |

---

## Response

```json
{
  "success": true,
  "data": {
    "transaction_id": 100,
    "wallet_type": "ACCOUNT",
    "wallet_id": 1,
    "transaction_type": "EXPENSE",
    "amount": 18000,
    "transaction_date": "2026-05-29",
    "updated_at": "2026-05-30T03:00:00Z"
  },
  "error": null
}
```

---

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 400 | VALIDATION_001 | 수정 가능한 필드가 없거나 형식 오류 |
| 400 | TX_001 | 미래 날짜 저장 불가 |
| 400 | TX_002 | 금액 오류 |
| 400 | TX_007 | 카드 수입 거래 저장 불가 |
| 400 | ACCOUNT_004 | 계좌 잔액 부족. 지출 금액이 현재 잔액을 초과함 |
| 400 | WALLET_001 | 삭제된 지갑의 거래는 수정 불가 |
| 401 | AUTH_002 | 인증 실패 또는 토큰 만료 |
| 403 | AUTH_009 | 다른 사용자의 거래 접근 |
| 404 | TX_003 | 존재하지 않는 계좌 |
| 404 | TX_004 | 존재하지 않는 카드 |
| 404 | TX_005 | 거래 없음 또는 삭제된 거래 |
| 409 | SYNC_002 | updated_at 기준 동기화 충돌 |

---

## 오프라인 처리 주의사항

| 상황 | 처리 |
|---|---|
| 서버 반영 전 CREATE 거래 수정 | 기존 CREATE Queue payload를 갱신하고 UPDATE Queue를 생성하지 않음 |
| 서버 반영 완료 거래 수정 | UPDATE Queue 등록 |
| DELETE Queue 존재 거래 수정 | UPDATE Queue 생성 금지 |
| 동기화 충돌 | `sync_conflict` 상태로 SYNC_HISTORY에 기록. 클라이언트 데이터를 서버에 강제 반영(클라이언트 우선). 사용자 선택 UI 없음 |

---

## 프론트 처리 주의사항

- 저장 버튼은 `saving` 상태에서 중복 클릭을 차단한다.
- 수입 선택 시 카드 선택 UI를 비활성화한다.
- 수정 성공 후 거래 목록, 상세, 대시보드, 통계 Query를 무효화한다.
- 오프라인 수정은 화면에서 성공처럼 보일 수 있지만 `pending_sync` 배지를 함께 표시한다.

# 거래 삭제 API

## 목적

거래를 물리 삭제하지 않고 Soft Delete 처리한다.

계좌 거래 삭제 시 기존 거래가 반영한 계좌 잔액을 복구하고, 카드 거래 삭제 시 카드 거래 내역만 삭제 상태로 변경한다.

## Endpoint

`DELETE /api/v1/transactions/{id}`

---

## Path Parameters

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| id | number | Y | 삭제할 거래 ID |

---

## Response

```json
{
  "success": true,
  "data": {
    "transaction_id": 100,
    "deleted_yn": true,
    "updated_at": "2026-05-30T03:10:00Z"
  },
  "error": null
}
```

---

## 비즈니스 규칙

| 항목 | 처리 규칙 |
|---|---|
| 삭제 방식 | `deleted_yn=true` Soft Delete |
| 계좌 거래 삭제 | 계좌 잔액을 삭제 전 상태로 복구 |
| 카드 거래 삭제 | 계좌 잔액 변경 없이 거래만 삭제 처리 |
| 이미 삭제된 거래 | `TX_005` 반환 |
| 삭제 거래 조회 | 기본 목록, 최근 거래, 통계에서 제외 |

---

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 401 | AUTH_002 | 인증 실패 또는 토큰 만료 |
| 403 | AUTH_009 | 다른 사용자의 거래 접근 |
| 404 | TX_005 | 거래 없음 또는 삭제된 거래 |
| 409 | SYNC_002 | updated_at 기준 동기화 충돌 |

---

## 오프라인 처리 주의사항

| 상황 | 처리 |
|---|---|
| 서버 반영 전 CREATE 거래 삭제 | CREATE Queue 제거 및 로컬 거래 삭제 |
| 서버 반영 완료 거래 삭제 | DELETE Queue 등록 및 로컬 `deleted_yn=true` 반영 |
| UPDATE Queue 대기 중 삭제 | UPDATE Queue 제거 후 DELETE Queue 생성 |
| DELETE Queue 대기 중 재삭제 | 기존 DELETE Queue 유지 |

---

## 프론트 처리 주의사항

- 삭제 직후 목록에서 항목을 숨기되, `pending_sync` 상태에서는 동기화 대기 표시를 유지한다.
- 삭제 실패 시 항목을 다시 노출하고 오류 메시지를 표시한다.
- 삭제 성공 후 거래 목록, 상세, 대시보드, 통계 Query를 무효화한다.

# 거래 상세 조회 API

## 목적

거래 목록 또는 대시보드 최근 거래에서 선택한 단일 거래의 상세 정보를 조회한다.

## Endpoint

`GET /api/v1/transactions/{id}`

---

## Path Parameters

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| id | number | Y | 거래 ID |

---

## Response

```json
{
  "success": true,
  "data": {
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
  },
  "error": null
}
```

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
| memo | string/null | 메모 |
| transaction_date | string | 거래일 |
| created_at | string | 생성일시 |
| updated_at | string | 수정일시 |

---

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 401 | AUTH_002 | 인증 실패 또는 토큰 만료 |
| 403 | AUTH_009 | 다른 사용자의 거래 접근 |
| 404 | TX_005 | 거래 없음 또는 삭제된 거래 |

---

# 최근 거래 조회 API

## 목적

대시보드 또는 홈 화면에서 사용할 최근 거래 목록을 조회한다.

## Endpoint

`GET /api/v1/transactions/recent`

---

## Query Parameters

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| limit | number | N | 5 | 최근 거래 반환 개수. 1 이상 20 이하 |

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
| 사용자 범위 | 로그인 사용자 거래만 조회 |
| 삭제 거래 | deleted_yn=true 제외 |
| 정렬 | transaction_date 내림차순, created_at 내림차순 |
| limit | 1 이상 20 이하만 허용 |

---

# 거래 목록 조회 API

## 목적

거래 내역 화면에서 기간, 키워드, 계좌, 카드, 카테고리 조건으로 거래 목록을 조회한다.

## Endpoint

`GET /api/v1/transactions`

---

## Query Parameters

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| start_date | string | N | 이번 달 1일 | 조회 시작일. 사용자 로컬 캘린더 기준 `YYYY-MM-DD` |
| end_date | string | N | 오늘 | 조회 종료일. 사용자 로컬 캘린더 기준 `YYYY-MM-DD`. 기본값인 "오늘"도 사용자 timezone 기준 |
| keyword | string | N | 없음 | 메모 검색어 |
| wallet_type | string | N | 없음 | ACCOUNT/CARD |
| wallet_id | number | N | 없음 | `wallet_type=ACCOUNT`이면 account_id, `wallet_type=CARD`이면 card_id |
| category_id | number | N | 없음 | 카테고리 ID |
| transaction_type | string | N | 없음 | INCOME/EXPENSE |
| page | number | N | 1 | 페이지 번호 |
| limit | number | N | 20 | 페이지 크기. 1 이상 100 이하 |
| sort | string | N | transaction_date_desc | transaction_date_desc/transaction_date_asc/amount_desc/amount_asc |

---

## Request Example

```http
GET /api/v1/transactions?start_date=2026-05-01&end_date=2026-05-30&wallet_type=ACCOUNT&wallet_id=1&page=1&limit=20
Authorization: Bearer {access_token}
```

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
        "transaction_date": "2026-05-29"
      }
    ],
    "page": 1,
    "limit": 20,
    "total_count": 1
  },
  "error": null
}
```

---

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 400 | TX_006 | 잘못된 조회 조건 |
| 401 | AUTH_002 | 인증 실패 또는 토큰 만료 |
