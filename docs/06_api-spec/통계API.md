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
- Top 5 카테고리 산출 시 카테고리가 5개를 초과하면 6번째 이후는 `기타`로 합산한다
- Sankey와 Top 5는 지출 거래 중심으로 산출한다
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
    "top_category": {
      "category_id": 1,
      "category_name": "식비",
      "icon_id": 3,
      "amount": 320000
    },
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
| transaction_count | number | 삭제되지 않은 거래 건수 |
| top_category | object/null | 해당 월 최고 지출 카테고리. 지출 거래가 없으면 null |
| top_category.category_id | number | 카테고리 ID |
| top_category.category_name | string | 카테고리명 |
| top_category.icon_id | number/null | 아이콘 ID |
| top_category.amount | number | 해당 카테고리 지출 합계 |
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
| items | array | 카테고리별 통계 목록. 데이터가 없으면 빈 배열 |
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
| items | array | `group_by` 기준 기간별 합계 목록 |

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
      { "id": "account", "name": "계좌", "value": 500000 },
      { "id": "card", "name": "카드", "value": 320000 },
      { "id": "cat_1", "name": "식비", "value": 300000 },
      { "id": "cat_2", "name": "교통", "value": 150000 },
      { "id": "cat_other", "name": "기타", "value": 370000 }
    ],
    "links": [
      { "source": "total", "target": "account", "value": 500000 },
      { "source": "total", "target": "card", "value": 320000 },
      { "source": "account", "target": "cat_1", "value": 250000 },
      { "source": "account", "target": "cat_other", "value": 250000 },
      { "source": "card", "target": "cat_2", "value": 150000 },
      { "source": "card", "target": "cat_other", "value": 170000 }
    ]
  },
  "error": null
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| month | string | 조회 월 |
| total_expense | number | 해당 월 전체 지출 합계 |
| nodes | array | Sankey 노드 목록. 데이터가 없으면 빈 배열 |
| nodes[].id | string | 노드 식별자. `total`, `account`, `card`, `cat_{id}`, `cat_other` 형식 |
| nodes[].name | string | 노드 표시 이름 |
| nodes[].value | number | 노드 금액 |
| links | array | Sankey 링크(흐름) 목록. 데이터가 없으면 빈 배열 |
| links[].source | string | 출발 노드 ID |
| links[].target | string | 도착 노드 ID |
| links[].value | number | 링크 금액 (두께 비례) |

### 노드 구조

- **1단계 (좌):** `total` — 월 전체 지출
- **2단계 (중):** `account`, `card` — 결제수단별 지출 합계. `wallet_type` 필터 적용 시 해당 결제수단만 포함
- **3단계 (우):** 지출 카테고리 Top 5 + `cat_other`. 지출이 없거나 한 카테고리이면 `cat_other` 생략 가능

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
- 카테고리가 1개뿐이면 `cat_other`를 포함하지 않는다.
