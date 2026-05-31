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


# 아이콘 API

## 정책 요약

- 계좌/카드/카테고리 공통 사용
- show=true 데이터만 선택 목록에 표시
- 아이콘 삭제는 MVP에서 물리 삭제하지 않고 show=false로 표시 제외 처리
- 아이콘 선택 화면은 서버에 등록된 show=true 아이콘만 표시
- 전체 Lucide Icons를 직접 노출하지 않고, 기본 아이콘 시드와 사용자가 등록한 아이콘만 선택 가능
- 사용자는 아이콘 선택 화면에서 아이콘을 클릭해 단일 선택한다
- 기본 아이콘은 모든 회원에게 동일하게 제공하는 공통 데이터
- 사용자 등록 아이콘만 사용자별 데이터로 관리
- 모바일 캐시 가능

## 기본 아이콘 시드

MVP 기본 아이콘 시드는 Lucide icon name을 `icon_value`로 저장한다.

| 순서 | icon_value | 용도 예시 |
| ---: | --- | --- |
| 1 | tag | 기본 카테고리 공통 |
| 2 | wallet | 계좌 |
| 3 | credit-card | 카드 |
| 4 | shopping-bag | 쇼핑 |
| 5 | bus | 교통비 |
| 6 | utensils | 식비/점심 |
| 7 | heart-pulse | 의료 |
| 8 | graduation-cap | 교육 |
| 9 | music | 문화 |
| 10 | receipt | 공과금 |
| 11 | repeat | 구독 |
| 12 | circle-dollar-sign | 급여/수입 |

기본 카테고리 시드의 `icon_id`는 기본 아이콘 시드 중 `tag`를 공통 사용한다. 이후 사용자가 새 카테고리를 등록할 때는 아이콘 선택 화면에서 표시 가능한 아이콘을 클릭해 선택한다.

# 아이콘 목록 API

## Endpoint

`GET /api/v1/icons`

---

## Query Parameters

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| show | boolean | N | true | true면 표시 가능한 아이콘만 조회 |

---

## Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "icon_id": 1,
        "icon_value": "wallet",
        "show": true,
        "is_default": true,
        "created_at": "2026-05-30T01:00:00Z",
        "updated_at": "2026-05-30T01:00:00Z"
      }
    ]
  },
  "error": null
}
```

---

# 아이콘 등록 API

## 목적

계좌, 카드, 카테고리에서 공통으로 사용할 아이콘을 등록한다.

## Endpoint

`POST /api/v1/icons`

---

## Request Body

```json
{
  "icon_value": "wallet",
  "show": true
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| icon_value | string | Y | 렌더링에 사용할 아이콘 값 또는 파일 식별자 |
| show | boolean | N | 표시 여부. 기본값 true |

---

## 비즈니스 규칙

- 본 API는 사용자 아이콘만 등록한다.
- 기본 아이콘은 시드 데이터로만 생성하며 사용자 API로 등록하지 않는다.
- 전체 Lucide Icons를 클라이언트에서 임의로 등록하지 않고, 허용할 아이콘은 API를 통해 명시적으로 등록한다.

---

## Response

```json
{
  "success": true,
  "data": {
    "icon_id": 1
  },
  "error": null
}
```

---

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 400 | VALIDATION_001 | 필수값 누락 또는 형식 오류 |
| 409 | ICON_001 | 중복 아이콘 |

---

# 아이콘 수정 API

## 목적

아이콘 값, 표시 여부를 수정한다.

## Endpoint

`PUT /api/v1/icons/{id}`

---

## Path Parameters

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| id | number | Y | 아이콘 ID |

---

## Request Body

```json
{
  "icon_value": "wallet-filled",
  "show": false
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| icon_value | string | N | 변경할 아이콘 값 또는 파일 식별자 |
| show | boolean | N | 표시 여부. false면 선택 목록에서 제외 |

---

## Response

```json
{
  "success": true,
  "data": {
    "icon_id": 1,
    "show": false
  },
  "error": null
}
```

---

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 400 | VALIDATION_001 | 수정 가능한 필드가 없거나 형식 오류 |
| 404 | ICON_002 | 아이콘 없음 |
| 409 | ICON_001 | 중복 아이콘 |

---

## 표시 변경 정책

- 아이콘 표시 OFF는 `PUT /api/v1/icons/{id}` 요청의 `show=false`로 처리한다.
- `show=false` 아이콘은 계좌/카드/카테고리 등록 및 수정의 아이콘 선택 화면에서 제외한다.
- 기존 계좌/카드/카테고리에 연결된 아이콘은 표시 OFF 이후에도 기존 화면 표시에는 사용할 수 있다.
- 물리 삭제 API는 MVP 범위에서 제외한다.

## 아이콘 선택 정책

- 아이콘 선택 화면은 `GET /api/v1/icons?show=true` 응답을 기준으로 표시한다.
- 사용자가 아이콘을 클릭하면 해당 아이콘이 단일 선택된다.
- 선택 완료 후 호출 화면에 `icon_id`와 `icon_value`를 반환한다.
- 전체 Lucide Icons를 클라이언트에서 임의로 노출하지 않는다.
