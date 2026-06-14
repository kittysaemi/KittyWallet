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


# 카테고리 API

## 정책 요약

- icon_id 필수
- 카테고리 종류는 수입/지출로 구분하지 않음
- 기본 카테고리는 모든 회원에게 동일하게 제공하는 공통 데이터
- 사용자 등록 카테고리만 사용자별 데이터로 관리
- show=true 데이터만 신규 거래 선택 목록에 표시
- 기본 카테고리는 명칭과 아이콘 수정 불가, 숨김 가능
- 사용자 카테고리는 명칭, 아이콘, 표시 여부 수정 가능
- 모든 카테고리는 사용자별 `include_in_statistics` 값을 가지며 기본값은 true
- `include_in_statistics=false`는 통계 API 집계에서만 제외하며 거래내역, 최근 거래, 계좌 잔액에는 영향을 주지 않음
- `show`와 `include_in_statistics`는 독립 설정이다
- 카테고리 물리 삭제 API는 제공하지 않으며, 숨김은 `PUT /api/v1/categories/{id}`에서 `show=false`로 처리

## 기본 카테고리

| 순서 | 카테고리명 |
| ---: | --- |
| 1 | 급여 |
| 2 | 수입 |
| 3 | 지출 |
| 4 | 쇼핑 |
| 5 | 교통비 |
| 6 | 점심 |
| 7 | 식비 |
| 8 | 의료 |
| 9 | 교육 |
| 10 | 문화 |
| 11 | 공과금 |
| 12 | 구독 |
| 13 | 기타지출 |

정렬은 등록 순서를 따른다.

# 카테고리 등록 API

## Endpoint

`POST /api/v1/categories`

---

## Request Body

```json
{
  "category_name": "반려동물",
  "icon_id": 1,
  "show": true
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| category_name | string | Y | 카테고리명 |
| icon_id | number | Y | 아이콘 ID |
| show | boolean | N | 표시 여부. 기본값 true |

---

## 비즈니스 규칙

- 본 API는 사용자 카테고리만 등록한다.
- 기본 카테고리는 시드 데이터로만 생성하며 사용자 API로 등록하지 않는다.
- 카테고리명 중복은 기본 카테고리와 해당 사용자의 사용자 카테고리를 합쳐 검사한다.
- 카테고리명은 한글 기준 15자 이하로 입력한다.

---

## Response

```json
{
  "success": true,
  "data": {
    "category_id": 1
  },
  "error": null
}
```

---

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 400 | VALIDATION_001 | 필수값 누락 또는 형식 오류 |
| 401 | AUTH_002 | 인증 토큰 없음 또는 유효하지 않음 |
| 401 | AUTH_004 | 토큰 만료 |
| 404 | ICON_002 | 아이콘 없음 |
| 409 | CATEGORY_003 | 중복 카테고리명 |

# 카테고리 목록 API

## Endpoint

`GET /api/v1/categories`

---

## Query Parameters

| 이름 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| show | boolean | N | 전체 | 표시 여부 필터. 거래 등록 선택 목록은 `true` 사용 |

---

## Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "category_id": 1,
        "category_name": "식비",
        "icon_id": 1,
        "show": true,
        "include_in_statistics": true,
        "is_default": true,
        "editable": false,
        "created_at": "2026-05-30T02:00:00Z",
        "updated_at": "2026-05-30T02:10:00Z"
      }
    ]
  },
  "error": null
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| items | array | 카테고리 목록. 카테고리가 없으면 빈 배열 |
| category_id | number | 카테고리 ID |
| category_name | string | 카테고리명 |
| icon_id | number | 카테고리 아이콘 ID |
| show | boolean | 현재 사용자 기준 거래 등록 선택 목록 표시 여부 |
| include_in_statistics | boolean | 현재 사용자 기준 통계 포함 여부. false면 통계 집계에서 제외 |
| is_default | boolean | 기본 카테고리 여부 |
| editable | boolean | 명칭/아이콘 수정 가능 여부. 기본 카테고리는 false |
| created_at | string | 생성 시각, UTC ISO-8601 |
| updated_at | string | 최종 수정 시각, UTC ISO-8601 |

---

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 400 | VALIDATION_001 | query parameter 형식 오류 |
| 401 | AUTH_002 | 인증 토큰 없음 또는 유효하지 않음 |
| 401 | AUTH_004 | 토큰 만료 |
| 500 | CATEGORY_001 | 카테고리 조회 실패 |

---

## 프론트 처리 주의사항

- 거래 등록 화면은 `GET /api/v1/categories?show=true`를 사용한다.
- 카테고리 관리 화면은 `show`를 생략해 숨김 카테고리까지 표시한다.
- 숨김 카테고리는 기존 거래 상세에서는 표시할 수 있으나 신규 거래 선택 목록에는 노출하지 않는다.
- 기본 카테고리의 show 값은 사용자별 숨김 설정을 반영한 값이다.
- 통계 제외 관리 UI는 `include_in_statistics` 값을 사용한다.
- 통계 제외 상태는 신규 거래 선택 목록 표시 여부와 독립적으로 표시하고 저장한다.
- 기본 카테고리는 관리 화면에서 숨김/표시 변경만 제공하고 명칭/아이콘 수정 UI는 제공하지 않는다.

# 카테고리 수정/숨김 API

## Endpoint

`PUT /api/v1/categories/{id}`

---

## Request Body

```json
{
  "category_name": "외식",
  "icon_id": 2,
  "show": false,
  "include_in_statistics": false
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| category_name | string | N | 변경할 카테고리명. 사용자 카테고리만 가능 |
| icon_id | number | N | 변경할 아이콘 ID. 사용자 카테고리만 가능 |
| show | boolean | N | 표시 여부. false면 거래 등록 선택 목록에서 제외 |
| include_in_statistics | boolean | N | 통계 포함 여부. false면 통계 API 집계에서 제외 |

---

## 비즈니스 규칙

- 기본 카테고리는 `show`, `include_in_statistics`만 변경할 수 있다.
- 기본 카테고리의 `category_name`, `icon_id` 변경 요청은 실패 처리한다.
- 사용자 카테고리는 `category_name`, `icon_id`, `show`, `include_in_statistics`를 변경할 수 있다.
- 카테고리 숨김은 신규 거래 선택 목록에서만 제외하는 처리이며, 기존 거래에서는 계속 표시한다.
- 카테고리 통계 제외는 통계 API 집계에서만 제외하는 처리이며, 거래내역, 최근 거래, 계좌 잔액에는 영향을 주지 않는다.
- `PATCH /api/v1/categories/{id}`는 사용하지 않는다.

---

## Response

```json
{
  "success": true,
  "data": {
    "category_id": 1,
    "show": false,
    "include_in_statistics": false
  },
  "error": null
}
```

---

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 400 | VALIDATION_001 | 필수값 누락 또는 형식 오류 |
| 404 | CATEGORY_002 | 카테고리 없음 |
| 409 | CATEGORY_003 | 중복 카테고리명 |

---

## 지원하지 않는 API

| API | 처리 기준 |
|---|---|
| PATCH /api/v1/categories/{id} | 사용하지 않음. 카테고리 수정은 `PUT /api/v1/categories/{id}` 사용 |
| DELETE /api/v1/categories/{id} | 제공하지 않음. 카테고리 숨김은 `show=false` 사용 |
