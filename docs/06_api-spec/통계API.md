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


# 통계 API

## 통계 정책 요약

- 삭제 거래 제외
- 실시간 통계 계산
- 거래 데이터 기준 산출
- 월별/카테고리별 조회 지원
- 계좌 거래와 카드 거래는 `wallet_type` 기준으로 독립 집계 가능
- 카드 거래는 지출만 집계 대상이며 수입 통계에는 포함되지 않음
- 현재 사용자 기준 `include_in_statistics=false`인 카테고리의 거래는 모든 통계 집계에서 제외
- 카테고리 통계 제외는 월별, 기간별, 카테고리별, 요약, Top 5, 히트맵, 지출 Sankey, 수입 Sankey, 카테고리별 지출합계에 동일하게 적용
- 카테고리 통계 제외는 거래내역, 최근 거래, 거래 상세, 거래 검색, 계좌 잔액에는 영향을 주지 않음
- Top 5 카테고리 산출 시 카테고리가 5개를 초과하면 6번째 이후는 `기타`로 합산한다
- Sankey와 Top 5는 지출 거래 중심으로 산출한다. 수입 흐름 Sankey와 수입 Top 5는 수입 거래 중심으로 별도 산출한다
- Top 5 API는 6번째 이후 카테고리를 `기타`로 합산하지만, Sankey API는 카테고리를 `기타`로 합산하지 않고 전체 카테고리를 노드/링크로 반환한다
- 카테고리별 지출합계(category-expenses) API는 지출 거래만 집계하며 기간 선택(전체/년별/월별)을 지원한다
- 기본 조회 기간은 현재 월이다

# 월별 통계 API

## Endpoint

`GET /api/v1/statistics/monthly`

---

## Query Parameters

| 이름 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| month | string | N | 현재 월 | 조회 월. 사용자 로컬 캘린더 기준 `YYYY-MM`. 기본값인 "현재 월"도 사용자 timezone 기준 |
| wallet_type | string | N | 전체 | `ACCOUNT`, `CARD` |
| wallet_id | number | N | 전체 | 특정 계좌 또는 카드 ID. `wallet_type`과 함께 사용 |

---

## Response

```json
{
  "success": true,
  "data": {
    "month": "2026-05",
    "wallet_type": "ACCOUNT",
    "income_amount": 2500000,
    "expense_amount": 820000,
    "net_amount": 1680000,
    "transaction_count": 32,
    "daily_items": [
      {
        "date": "2026-05-01",
        "income_amount": 0,
        "expense_amount": 45000,
        "transaction_count": 2
      }
    ]
  },
  "error": null
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| month | string | 조회 월 |
| wallet_type | string/null | 요청한 결제수단 유형. 전체 조회 시 null |
| income_amount | number | 수입 합계 |
| expense_amount | number | 지출 합계 |
| net_amount | number | 수입 합계 - 지출 합계 |
| transaction_count | number | 삭제되지 않았고 통계 포함 카테고리에 속한 거래 건수 |
| daily_items | array | 일자별 합계 목록. 데이터가 없으면 빈 배열 |

---

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 400 | STAT_002 | 잘못된 월 또는 결제수단 조회 조건 |
| 401 | AUTH_002 | 인증 토큰 없음 또는 유효하지 않음 |
| 401 | AUTH_004 | 토큰 만료 |
| 500 | STAT_001 | 통계 조회 실패 |

---

## 프론트 처리 주의사항

- 데이터가 없는 월은 200 응답과 0 합계, 빈 `daily_items`로 처리한다.
- 카드 월별 통계는 `expense_amount` 중심으로 표시하고 수입 선택 UI와 연결하지 않는다.
- `wallet_id`를 사용할 때는 반드시 같은 `wallet_type`의 계좌/카드 목록에서 선택된 값만 전달한다.

# 카테고리 통계 API

## Endpoint

`GET /api/v1/statistics/category`

---

## Query Parameters

| 이름 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| start_date | string | Y | - | 조회 시작일. 사용자 로컬 캘린더 기준 `YYYY-MM-DD` |
| end_date | string | Y | - | 조회 종료일. 사용자 로컬 캘린더 기준 `YYYY-MM-DD` |
| transaction_type | string | N | 전체 | `INCOME`, `EXPENSE` |
| wallet_type | string | N | 전체 | `ACCOUNT`, `CARD` |
| wallet_id | number | N | 전체 | 특정 계좌 또는 카드 ID |
| limit | number | N | 10 | 상위 카테고리 개수. 1~50 |

---

## Response

```json
{
  "success": true,
  "data": {
    "start_date": "2026-05-01",
    "end_date": "2026-05-31",
    "total_amount": 820000,
    "items": [
      {
        "category_id": 1,
        "category_name": "식비",
        "icon_id": 3,
        "amount": 320000,
        "transaction_count": 12,
        "ratio": 39.02
      }
    ]
  },
  "error": null
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| total_amount | number | 조회 조건에 해당하는 거래 금액 합계 |
| items | array | 통계 포함 카테고리별 통계 목록. 데이터가 없으면 빈 배열 |
| ratio | number | `total_amount` 대비 비율. 소수점 둘째 자리까지 반올림 |

---

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 400 | STAT_002 | 날짜 범위, 거래 유형, 결제수단 조건 오류 |
| 401 | AUTH_002 | 인증 토큰 없음 또는 유효하지 않음 |
| 401 | AUTH_004 | 토큰 만료 |
| 500 | STAT_001 | 통계 조회 실패 |

---

## 집계 정책 (EXPENSE 기준)

- 카드 할부 거래는 회차별 분할 금액이 아닌 원래 결제일(`purchase_date`) 기준 원금(`original_amount`)으로 집계한다.
- 비할부 거래는 `amount + interest`를 합산한다.
- `transaction_type=INCOME` 조건에서는 일반 거래 합산을 사용한다.

## 프론트 처리 주의사항

- `transaction_type=INCOME`인 경우 카드 선택값을 전송하지 않는다.
- 차트는 `items`가 빈 배열이면 빈 상태 UI를 표시한다.
- 카테고리명이 변경되어도 과거 통계 표시는 서버 응답의 현재 카테고리명을 따른다.

# 기간별 통계 API

## Endpoint

`GET /api/v1/statistics/period`

---

## Query Parameters

| 이름 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| start_date | string | Y | - | 조회 시작일. 사용자 로컬 캘린더 기준 `YYYY-MM-DD` |
| end_date | string | Y | - | 조회 종료일. 사용자 로컬 캘린더 기준 `YYYY-MM-DD` |
| wallet_type | string | N | 전체 | `ACCOUNT`, `CARD` |
| wallet_id | number | N | 전체 | 특정 계좌 또는 카드 ID |
| group_by | string | N | `DAY` | `DAY`, `MONTH` |

---

## Response

```json
{
  "success": true,
  "data": {
    "start_date": "2026-05-01",
    "end_date": "2026-05-31",
    "income_amount": 2500000,
    "expense_amount": 820000,
    "net_amount": 1680000,
    "items": [
      {
        "period": "2026-05-01",
        "income_amount": 0,
        "expense_amount": 45000,
        "transaction_count": 2
      }
    ]
  },
  "error": null
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| start_date | string | 조회 시작일 |
| end_date | string | 조회 종료일 |
| income_amount | number | 기간 내 수입 합계 |
| expense_amount | number | 기간 내 지출 합계 |
| net_amount | number | 수입 합계 - 지출 합계 |
| items | array | `group_by` 기준 기간별 합계 목록. 통계 제외 카테고리 거래는 포함하지 않음 |

---

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 400 | STAT_002 | 날짜 범위, 결제수단, 그룹 기준 오류 |
| 401 | AUTH_002 | 인증 토큰 없음 또는 유효하지 않음 |
| 401 | AUTH_004 | 토큰 만료 |
| 500 | STAT_001 | 통계 조회 실패 |

---

## 프론트 처리 주의사항

- 기간 조회는 차트 축 생성을 위해 `items`의 누락 기간을 프론트에서 0 값으로 보정할 수 있다.
- `group_by=MONTH`는 월 단위 비교 화면에서 사용한다.
- 과도한 기간 조회를 방지하기 위해 프론트에서 기본 12개월 이하 범위를 권장한다.

---

## 프론트 처리 주의사항

- 차트 데이터 캐싱 가능
- 최근 통계 우선 로딩 권장
- 캐시 데이터에는 조회 조건을 키로 포함한다.

# 월간 요약 통계 API

## Endpoint

`GET /api/v1/statistics/summary`

---

## Query Parameters

| 이름 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| month | string | N | 현재 월 | 조회 월. 사용자 로컬 캘린더 기준 `YYYY-MM` |
| wallet_type | string | N | 전체 | `ACCOUNT`, `CARD` |
| wallet_id | number | N | 전체 | 특정 계좌 또는 카드 ID. `wallet_type`과 함께 사용 |

---

## Response

```json
{
  "success": true,
  "data": {
    "month": "2026-05",
    "income_amount": 2500000,
    "expense_amount": 820000,
    "net_amount": 1680000,
    "transaction_count": 32,
    "top_category": {
      "category_id": 1,
      "category_name": "식비",
      "icon_id": 3,
      "amount": 320000
    }
  },
  "error": null
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| month | string | 조회 월 |
| income_amount | number | 수입 합계 |
| expense_amount | number | 지출 합계 |
| net_amount | number | 수입 합계 - 지출 합계 |
| transaction_count | number | 삭제되지 않았고 통계 포함 카테고리에 속한 거래 건수 |
| top_category | object/null | 해당 월 최고 지출 카테고리. 통계 포함 지출 거래가 없으면 null |
| top_category.category_id | number | 카테고리 ID |
| top_category.category_name | string | 카테고리명 |
| top_category.icon_id | number/null | 아이콘 ID |
| top_category.amount | number | 해당 카테고리 지출 합계 |

---

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 400 | STAT_002 | 잘못된 월 또는 결제수단 조회 조건 |
| 401 | AUTH_002 | 인증 토큰 없음 또는 유효하지 않음 |
| 401 | AUTH_004 | 토큰 만료 |
| 500 | STAT_001 | 통계 조회 실패 |

---

## 프론트 처리 주의사항

- `top_category`가 null이면 최고 지출 카테고리 카드를 empty 상태로 표시한다.
- 카드 월별 통계는 `expense_amount` 중심으로 표시하고 수입 선택 UI와 연결하지 않는다.

# 카테고리 Top 5 통계 API

## Endpoint

`GET /api/v1/statistics/category-top`

---

## Query Parameters

| 이름 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| month | string | N | 현재 월 | 조회 월. 사용자 로컬 캘린더 기준 `YYYY-MM` |
| wallet_type | string | N | 전체 | `ACCOUNT`, `CARD` |
| wallet_id | number | N | 전체 | 특정 계좌 또는 카드 ID. `wallet_type`과 함께 사용 |
| transaction_type | string | N | `EXPENSE` | `INCOME`, `EXPENSE`. 수입/지출 기준 전환 |

---

## Response

`transaction_type=EXPENSE` (기본값) 응답:

```json
{
  "success": true,
  "data": {
    "month": "2026-05",
    "total_expense": 820000,
    "items": [
      {
        "rank": 1,
        "category_id": 1,
        "category_name": "식비",
        "icon_id": 3,
        "amount": 320000,
        "ratio": 39.02
      },
      {
        "rank": null,
        "category_id": null,
        "category_name": "기타",
        "icon_id": null,
        "amount": 150000,
        "ratio": 18.29
      }
    ]
  },
  "error": null
}
```

`transaction_type=INCOME` 응답:

```json
{
  "success": true,
  "data": {
    "month": "2026-05",
    "total_income": 2500000,
    "items": [
      {
        "rank": 1,
        "category_id": 5,
        "category_name": "급여",
        "icon_id": 7,
        "amount": 2000000,
        "ratio": 80.00
      }
    ]
  },
  "error": null
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| month | string | 조회 월 |
| total_expense | number | 해당 월 통계 포함 카테고리 기준 지출 합계. `transaction_type=EXPENSE`(기본값) 시 포함 |
| total_income | number | 해당 월 통계 포함 카테고리 기준 수입 합계. `transaction_type=INCOME` 시 포함 |
| items | array | 통계 포함 카테고리 기준 Top 5 카테고리 + 기타 목록. 데이터가 없으면 빈 배열 |
| items[].rank | number/null | 순위. `기타` 항목은 null |
| items[].category_id | number/null | 카테고리 ID. `기타` 항목은 null |
| items[].category_name | string | 카테고리명. 6위 이후는 `기타` |
| items[].icon_id | number/null | 아이콘 ID. `기타` 항목은 null |
| items[].amount | number | 금액 합계 |
| items[].ratio | number | 총액 대비 비율. 소수점 둘째 자리까지 반올림 |

### 항목 구성 규칙

- 카테고리가 5개 이하이면 `기타` 항목을 포함하지 않는다.
- 카테고리가 6개 이상이면 6위 이후를 `기타`로 합산하여 목록 마지막에 추가한다.
- 해당 유형 거래가 없으면 `items`는 빈 배열이다.
- `transaction_type=INCOME`이면서 `wallet_type=CARD`인 경우 400 오류를 반환한다 (카드는 수입 거래 불가).

---

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 400 | STAT_002 | 잘못된 월, 결제수단, 거래 유형 조회 조건 |
| 401 | AUTH_002 | 인증 토큰 없음 또는 유효하지 않음 |
| 401 | AUTH_004 | 토큰 만료 |
| 500 | STAT_001 | 통계 조회 실패 |

---

## 프론트 처리 주의사항

- `items`가 빈 배열이면 empty UI를 표시한다.
- `기타` 항목은 아이콘 없이 텍스트만 표시한다.
- `transaction_type=INCOME` 요청 시에는 `total_income` 필드를 사용한다.

# 달력 히트맵 통계 API

## Endpoint

`GET /api/v1/statistics/calendar`

---

## Query Parameters

| 이름 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| month | string | N | 현재 월 | 조회 월. 사용자 로컬 캘린더 기준 `YYYY-MM` |
| wallet_type | string | N | 전체 | `ACCOUNT`, `CARD` |
| wallet_id | number | N | 전체 | 특정 계좌 또는 카드 ID. `wallet_type`과 함께 사용 |

---

## Response

```json
{
  "success": true,
  "data": {
    "month": "2026-05",
    "max_daily_expense": 150000,
    "daily_items": [
      {
        "date": "2026-05-01",
        "expense_amount": 45000
      }
    ]
  },
  "error": null
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| month | string | 조회 월 |
| max_daily_expense | number | 해당 월 통계 포함 카테고리 기준 일별 지출 최댓값. 색상 강도 계산 기준. 지출 없으면 0 |
| daily_items | array | 통계 포함 지출이 있는 날짜 목록. 지출 없는 날짜는 포함하지 않음 |
| daily_items[].date | string | 날짜 `YYYY-MM-DD` |
| daily_items[].expense_amount | number | 해당 날짜 지출 합계 |

---

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 400 | STAT_002 | 잘못된 월 또는 결제수단 조회 조건 |
| 401 | AUTH_002 | 인증 토큰 없음 또는 유효하지 않음 |
| 401 | AUTH_004 | 토큰 만료 |
| 500 | STAT_001 | 통계 조회 실패 |

---

## 프론트 처리 주의사항

- `max_daily_expense`를 기준으로 각 날짜 셀의 색상 강도를 계산한다.
- `daily_items`가 빈 배열이면 모든 날짜 셀을 동일한 기본 색상으로 표시한다.

# Sankey 통계 API

## Endpoint

`GET /api/v1/statistics/sankey`

---

## Query Parameters

| 이름 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| month | string | N | 현재 월 | 조회 월. 사용자 로컬 캘린더 기준 `YYYY-MM` |
| wallet_type | string | N | 전체 | `ACCOUNT`, `CARD` |
| wallet_id | number | N | 전체 | 특정 계좌 또는 카드 ID. `wallet_type`과 함께 사용 |

---

## Response

```json
{
  "success": true,
  "data": {
    "month": "2026-05",
    "total_expense": 820000,
    "nodes": [
      { "id": "total", "name": "총 지출", "value": 820000 },
      { "id": "w_1", "name": "우리은행 통장", "value": 500000 },
      { "id": "w_2", "name": "신한카드", "value": 320000 },
      { "id": "cat_1", "name": "식비", "value": 300000 },
      { "id": "cat_2", "name": "교통", "value": 150000 },
      { "id": "cat_3", "name": "취미", "value": 370000 }
    ],
    "links": [
      { "source": "total", "target": "w_1", "value": 500000 },
      { "source": "total", "target": "w_2", "value": 320000 },
      { "source": "w_1", "target": "cat_1", "value": 250000 },
      { "source": "w_1", "target": "cat_3", "value": 250000 },
      { "source": "w_2", "target": "cat_2", "value": 150000 },
      { "source": "w_2", "target": "cat_3", "value": 170000 }
    ]
  },
  "error": null
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| month | string | 조회 월 |
| total_expense | number | 해당 월 통계 포함 카테고리 기준 전체 지출 합계 |
| nodes | array | Sankey 노드 목록. 데이터가 없으면 빈 배열 |
| nodes[].id | string | 노드 식별자. `total`, `w_{walletId}`, `cat_{id}` 형식 |
| nodes[].name | string | 노드 표시 이름 |
| nodes[].value | number | 노드 금액 |
| links | array | Sankey 링크(흐름) 목록. 데이터가 없으면 빈 배열 |
| links[].source | string | 출발 노드 ID |
| links[].target | string | 도착 노드 ID |
| links[].value | number | 링크 금액 (두께 비례) |

### 노드 구조

- **1단계 (좌):** `total` — 월 전체 지출
- **2단계 (중):** `w_{walletId}` — 개별 지갑별 지출 합계 (계좌명 또는 카드명 표시). `wallet_type` 필터 적용 시 해당 지갑 유형만 포함
- **3단계 (우):** 통계 포함 지출 카테고리. `cat_other` 노드는 생성하지 않음

---

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 400 | STAT_002 | 잘못된 월 또는 결제수단 조회 조건 |
| 401 | AUTH_002 | 인증 토큰 없음 또는 유효하지 않음 |
| 401 | AUTH_004 | 토큰 만료 |
| 500 | STAT_001 | 통계 조회 실패 |

---

## 프론트 처리 주의사항

- `nodes`가 빈 배열이면 Sankey를 렌더링하지 않고 empty UI를 표시한다.
- Sankey 렌더링 실패(라이브러리 오류 등)가 발생해도 통계 화면 전체가 깨지지 않아야 한다.
- 모바일 360px 폭에서 노드 라벨 겹침/잘림이 없어야 한다.
- Sankey는 카테고리 수와 관계없이 `cat_other`를 포함하지 않는다.

# 수입 흐름 Sankey 통계 API

## Endpoint

`GET /api/v1/statistics/sankey-income`

---

## Query Parameters

| 이름 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| month | string | N | 현재 월 | 조회 월. 사용자 로컬 캘린더 기준 `YYYY-MM` |
| wallet_type | string | N | 전체 | `ACCOUNT` (카드는 수입 거래 없으므로 사실상 ACCOUNT만 유효) |
| wallet_id | number | N | 전체 | 특정 계좌 ID. `wallet_type`과 함께 사용 |

---

## Response

```json
{
  "success": true,
  "data": {
    "month": "2026-05",
    "total_income": 2500000,
    "nodes": [
      { "id": "total", "name": "총 수입", "value": 2500000 },
      { "id": "w_1", "name": "우리은행 통장", "value": 2500000 },
      { "id": "cat_5", "name": "급여", "value": 2000000 },
      { "id": "cat_6", "name": "부수입", "value": 500000 }
    ],
    "links": [
      { "source": "total", "target": "w_1", "value": 2500000 },
      { "source": "w_1", "target": "cat_5", "value": 2000000 },
      { "source": "w_1", "target": "cat_6", "value": 500000 }
    ]
  },
  "error": null
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| month | string | 조회 월 |
| total_income | number | 해당 월 통계 포함 카테고리 기준 전체 수입 합계 |
| nodes | array | Sankey 노드 목록. 데이터가 없으면 빈 배열 |
| nodes[].id | string | 노드 식별자. `total`, `w_{walletId}`, `cat_{id}` 형식 |
| nodes[].name | string | 노드 표시 이름 |
| nodes[].value | number | 노드 금액 |
| links | array | Sankey 링크(흐름) 목록. 데이터가 없으면 빈 배열 |
| links[].source | string | 출발 노드 ID |
| links[].target | string | 도착 노드 ID |
| links[].value | number | 링크 금액 (두께 비례) |

### 노드 구조

- **1단계 (좌):** `total` — 월 전체 수입
- **2단계 (중):** `w_{walletId}` — 개별 계좌별 수입 합계 (계좌명 표시). 카드는 수입 거래가 없으므로 표시되지 않음
- **3단계 (우):** 통계 포함 수입 카테고리. `cat_other` 노드는 생성하지 않음

---

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 400 | STAT_002 | 잘못된 월 또는 결제수단 조회 조건 |
| 401 | AUTH_002 | 인증 토큰 없음 또는 유효하지 않음 |
| 401 | AUTH_004 | 토큰 만료 |
| 500 | STAT_001 | 통계 조회 실패 |

---

## 프론트 처리 주의사항

- `nodes`가 빈 배열이거나 `total_income`이 0이면 empty UI를 표시한다.
- 노드 색상은 파란색 계열(`#38BDF8` 기준)로 지출 흐름과 시각적으로 구분한다.
- 카드 지갑은 수입 거래 특성상 표시되지 않는다.

# 카테고리별 지출합계 통계 API

## Endpoint

`GET /api/v1/statistics/category-expenses`

---

## Query Parameters

| 이름 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| period_type | string | N | `all` | `all`, `year`, `month`. 기간 유형 선택 |
| year | string | N | - | `period_type=year` 또는 `period_type=month` 시 사용. `YYYY` 형식 |
| month | string | N | - | `period_type=month` 시 필수. 사용자 로컬 캘린더 기준 `YYYY-MM` |
| wallet_type | string | N | 전체 | `ACCOUNT`, `CARD`. 특정 결제수단 유형만 집계 |
| wallet_id | number | N | 전체 | 특정 계좌 또는 카드 ID. `wallet_type`과 함께 사용 |

### 파라미터 조합 규칙

| period_type | year | month | 설명 |
|---|---|---|---|
| `all` (또는 미입력) | 무시 | 무시 | 전체 기간 지출 집계 (날짜 범위 없음) |
| `year` | 필수 | 무시 | 해당 연도 1월 1일 ~ 12월 31일 |
| `month` | 자동추출 | 필수 | 해당 월 1일 ~ 말일 |

---

## Response

```json
{
  "success": true,
  "data": {
    "period_type": "month",
    "total_amount": 820000,
    "items": [
      {
        "category_id": 1,
        "category_name": "식비",
        "icon_id": 3,
        "amount": 320000,
        "transaction_count": 12,
        "ratio": 39.02
      },
      {
        "category_id": 2,
        "category_name": "교통",
        "icon_id": 5,
        "amount": 150000,
        "transaction_count": 8,
        "ratio": 18.29
      }
    ]
  },
  "error": null
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| period_type | string | 요청한 기간 유형 (`all`, `year`, `month`) |
| total_amount | number | 기간 내 지출 합계 (통계 포함 카테고리, 삭제되지 않은 거래 기준) |
| items | array | 카테고리별 지출 목록. 금액 내림차순 정렬. 데이터가 없으면 빈 배열 |
| items[].category_id | number | 카테고리 ID |
| items[].category_name | string | 카테고리명 |
| items[].icon_id | number/null | 아이콘 ID |
| items[].amount | number | 해당 카테고리 지출 합계 (카드 할부 포함: `amount + interest`) |
| items[].transaction_count | number | 해당 카테고리 거래 건수 |
| items[].ratio | number | `total_amount` 대비 비율. 소수점 둘째 자리까지 반올림 |

### 집계 정책

- 지출(`EXPENSE`) 거래만 집계한다. 수입 거래는 제외한다.
- `include_in_statistics=false`인 카테고리의 거래는 제외한다.
- `deleted_yn=true`인 거래는 제외한다.
- 카드 할부 거래는 회차별 분할 금액이 아닌 원래 결제일(`purchase_date`) 기준 원금(`original_amount`)으로 집계한다. 비할부 거래는 `amount + interest`를 합산한다.
- 결과는 `amount` 내림차순으로 정렬된다.
- `Top 5` 제한 없이 모든 카테고리를 반환한다.

---

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 400 | STAT_002 | `period_type=month` 시 `month` 미입력, `period_type=year` 시 `year` 미입력, 잘못된 날짜 포맷 |
| 401 | AUTH_002 | 인증 토큰 없음 또는 유효하지 않음 |
| 401 | AUTH_004 | 토큰 만료 |
| 500 | STAT_001 | 통계 조회 실패 |

---

## 프론트 처리 주의사항

- `items`가 빈 배열이면 empty UI를 표시한다.
- `period_type=all`이면 기간 네비게이터를 숨긴다.
- `period_type=year`이면 연도 네비게이터만 표시한다 (미래 연도 이동 불가).
- `period_type=month`이면 월 네비게이터를 표시한다 (미래 월 이동 불가).
- 기간 상태는 공통 `baseDate`, `viewMode`와 독립적으로 관리한다.
