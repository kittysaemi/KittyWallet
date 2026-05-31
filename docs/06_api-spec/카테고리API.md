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
- show=true 데이터만 선택 목록에 표시
- 사용자 커스텀 카테고리 지원

# 카테고리 등록 API

## Endpoint

`POST /api/v1/categories`

---

## Request Body

```json
{
  "category_name": "식비",
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
| show | boolean | 거래 등록 선택 목록 표시 여부 |
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

# 카테고리 수정 API

## Endpoint

`PUT /api/v1/categories/{id}`

---

## Request Body

```json
{
  "category_name": "외식",
  "icon_id": 2,
  "show": false
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| category_name | string | N | 변경할 카테고리명 |
| icon_id | number | N | 변경할 아이콘 ID |
| show | boolean | N | 표시 여부. false면 거래 등록 선택 목록에서 제외 |

---

## Response

```json
{
  "success": true,
  "data": {
    "category_id": 1,
    "show": false
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
