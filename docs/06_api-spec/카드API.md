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


# 카드 API

## 카드 정책 요약

- icon_id 필수
- use_yn 사용 여부 지원
- 카드 거래는 통계 데이터 반영
- 사용자별 카드 데이터 분리
- 비활성화: `PUT /api/v1/cards/{id}`에서 `use_yn=false`로 처리
- 아카이브(영구 삭제): `DELETE /api/v1/cards/{id}`로 처리. 아카이브된 카드명은 재사용 가능

---

# 카드 등록 API

## Endpoint

`POST /api/v1/cards`

---

## Request Body

```json
{
  "card_name": "신한카드",
  "icon_id": 1,
  "use_yn": true
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| card_name | string | Y | 카드명. 사용자 내 중복 불가 |
| icon_id | number | Y | 카드 아이콘 ID |
| use_yn | boolean | N | 카드 사용 여부. 기본값 true |

---

## 비즈니스 규칙

| 항목 | 처리 규칙 |
|---|---|
| 사용 여부 OFF | 선택 화면 제외 |
| 삭제 처리 | 삭제 API 없음. `use_yn=false` 비활성 처리만 지원. 거래 이력 보존을 위해 물리 삭제 금지 |
| 거래 연결 | TRANSACTION 기준 관리 |
| 카드명 길이 | 한글 기준 15자 이하 |

---

## Response

```json
{
  "success": true,
  "data": {
    "card_id": 1
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
| 409 | CARD_003 | 중복 카드명 |

---

# 카드 수정/비활성화 API

## Endpoint

`PUT /api/v1/cards/{id}`

---

## Request Body

```json
{
  "card_name": "신한카드",
  "icon_id": 1,
  "use_yn": false
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| card_name | string | N | 변경할 카드명 |
| icon_id | number | N | 변경할 아이콘 ID |
| use_yn | boolean | N | 카드 사용 여부. false면 거래 등록 선택 목록에서 제외 |

---

## 비활성화 처리

카드 사용 중지는 본 API에 `use_yn=false`를 전달해 처리한다.

비활성화된 카드는 거래 등록 선택 목록에서 제외하지만, 기존 카드 거래 내역과 통계 산출 기준은 유지한다.

`PATCH /api/v1/cards/{id}`는 카드 수정 API로 사용하지 않는다.

---

## Response

```json
{
  "success": true,
  "data": {
    "card_id": 1,
    "use_yn": false
  },
  "error": null
}
```

---

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 400 | VALIDATION_001 | 수정 가능한 필드가 없거나 형식 오류 |
| 404 | CARD_002 | 카드 없음 |
| 409 | CARD_003 | 중복 카드명 |

---

## 지원하지 않는 API

| API | 처리 기준 |
|---|---|
| PATCH /api/v1/cards/{id} | 사용하지 않음. 카드 수정은 `PUT /api/v1/cards/{id}` 사용 |

---

# 카드 아카이브 API

## Endpoint

`DELETE /api/v1/cards/{id}`

---

## Path Parameters

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| id | number | Y | 아카이브할 카드 ID |

---

## Request Body

```json
{
  "delete_transactions": false
}
```

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| delete_transactions | boolean | N | false | true면 연결 거래도 함께 소프트 삭제 |

---

## 비즈니스 규칙

| 항목 | 처리 규칙 |
|---|---|
| 아카이브 방식 | `deleted_yn=true` 설정. 물리 삭제 아님 |
| 거래 보존 | `delete_transactions=false`(기본값)이면 연결 거래 보존. 보존된 거래는 조회 및 삭제만 가능, 수정 불가 |
| 거래 삭제 | `delete_transactions=true`이면 연결 거래 전체 소프트 삭제 |
| 카드명 재사용 | 아카이브된 카드명은 동일 사용자 내 재등록 시 사용 가능 |
| 이미 아카이브된 카드 | `CARD_002` 반환 |

---

## Response

```json
{
  "success": true,
  "data": null,
  "error": null
}
```

---

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 401 | AUTH_002 | 인증 토큰 없음 또는 유효하지 않음 |
| 403 | AUTH_009 | 다른 사용자 카드 접근 |
| 404 | CARD_002 | 카드 없음 또는 이미 아카이브됨 |

---

# 카드 목록 조회 API

## Endpoint

`GET /api/v1/cards`

---

## Query Parameters

| 이름 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| use_yn | boolean | N | 전체 | 카드 사용 여부 필터. 거래 등록 선택 목록은 `true` 사용 |

---

## Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "card_id": 1,
        "card_name": "신한카드",
        "icon_id": 1,
        "use_yn": true,
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
| items | array | 카드 목록. 카드가 없으면 빈 배열 |
| card_id | number | 카드 ID |
| card_name | string | 카드명 |
| icon_id | number | 카드 아이콘 ID |
| use_yn | boolean | 카드 사용 여부 |
| created_at | string | 생성 시각, UTC ISO-8601 |
| updated_at | string | 최종 수정 시각, UTC ISO-8601 |

---

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 400 | VALIDATION_001 | query parameter 형식 오류 |
| 401 | AUTH_002 | 인증 토큰 없음 또는 유효하지 않음 |
| 401 | AUTH_004 | 토큰 만료 |
| 500 | CARD_001 | 카드 조회 실패 |

---

## 프론트 처리 주의사항

- 거래 등록 화면에서 `transaction_type=EXPENSE`일 때만 카드 목록을 노출한다.
- 거래 등록 화면의 지갑 선택은 `GET /api/v1/cards?use_yn=true`를 사용한다.
- 카드 관리 화면은 `use_yn`을 생략해 OFF 카드까지 표시한다.
