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


# 계좌 API

## 계좌 정책 요약

- initial_balance 사용
- current_balance 자동 계산
- allow_negative_balance 기본값 false, 계좌 등록 시에만 설정 가능
- negative_balance_limit 기본값 0, 0 이상, 계좌 등록 시에만 설정 가능
- icon_id 필수
- 사용자별 계좌 분리
- 아카이브(영구 삭제): `DELETE /api/v1/accounts/{id}`로 처리. 아카이브된 계좌명은 재사용 가능

---

# 계좌 등록 API

## Endpoint

`POST /api/v1/accounts`

---

## Request Body

```json
{
  "account_name": "생활비 통장",
  "initial_balance": 500000,
  "icon_id": 1,
  "allow_negative_balance": false,
  "negative_balance_limit": 0
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| account_name | string | Y | 계좌명. 사용자 내 중복 불가 |
| initial_balance | number | Y | 초기 잔액. 0 이상 |
| icon_id | number | Y | 계좌 아이콘 ID |
| allow_negative_balance | boolean | N | 마이너스 잔액 허용 여부. 기본값 false |
| negative_balance_limit | number | N | 마이너스 한도. 0 이상. `allow_negative_balance=false`면 0 처리 |

---

## 비즈니스 규칙

| 항목 | 처리 규칙 |
|---|---|
| 중복 계좌명 | 불가 |
| 잔액 수정 | 거래 기준 자동 계산 |
| 마이너스 허용 | 계좌 등록 시 설정 가능. 등록 후 변경 미지원 |
| 마이너스 한도 | 계좌 등록 시 0 이상. 미허용 계좌는 0 처리. 등록 후 변경 미지원 |
| 계좌명 길이 | 한글 기준 15자 이하 |

---

## Response

```json
{
  "success": true,
  "data": {
    "account_id": 1
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
| 409 | ACCOUNT_001 | 중복 계좌명 |

---

## 프론트 처리 주의사항

- 잔액 직접 수정 UI 제공 금지

---

# 계좌 수정 API

## Endpoint

`PUT /api/v1/accounts/{id}`

---

## Request Body

```json
{
  "account_name": "생활비 통장",
  "icon_id": 1
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| account_name | string | N | 변경할 계좌명 |
| icon_id | number | N | 변경할 아이콘 ID |

---

## 마이너스 설정 변경

`allow_negative_balance`와 `negative_balance_limit`는 계좌 등록 시에만 설정할 수 있다.

계좌 수정 API는 등록 후 마이너스 허용 여부 또는 마이너스 한도 변경을 지원하지 않는다.

`PATCH /api/v1/accounts/{id}`는 계좌 수정 API로 사용하지 않는다.

---

## Response

```json
{
  "success": true,
  "data": {
    "account_id": 1
  },
  "error": null
}
```

---

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 400 | VALIDATION_001 | 수정 가능한 필드가 없거나 형식 오류 |
| 404 | ACCOUNT_002 | 계좌 없음 |
| 409 | ACCOUNT_001 | 중복 계좌명 |

---

## 지원하지 않는 API

| API | 처리 기준 |
|---|---|
| PATCH /api/v1/accounts/{id} | 사용하지 않음. 계좌 수정은 `PUT /api/v1/accounts/{id}` 사용 |

---

# 계좌 아카이브 API

## Endpoint

`DELETE /api/v1/accounts/{id}`

---

## Path Parameters

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| id | number | Y | 아카이브할 계좌 ID |

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
| 계좌명 재사용 | 아카이브된 계좌명은 동일 사용자 내 재등록 시 사용 가능 |
| 이미 아카이브된 계좌 | `ACCOUNT_002` 반환 |

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
| 403 | AUTH_009 | 다른 사용자 계좌 접근 |
| 404 | ACCOUNT_002 | 계좌 없음 또는 이미 아카이브됨 |

---

# 계좌 목록 API

## Endpoint

`GET /api/v1/accounts`

---

## Query Parameters

| 이름 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| include_balance | boolean | N | true | `current_balance` 포함 여부 |

---

## Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "account_id": 1,
        "account_name": "생활비 통장",
        "icon_id": 1,
        "initial_balance": 500000,
        "current_balance": 420000,
        "allow_negative_balance": false,
        "negative_balance_limit": 0,
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
| items | array | 계좌 목록. 계좌가 없으면 빈 배열 |
| account_id | number | 계좌 ID |
| account_name | string | 계좌명 |
| icon_id | number | 계좌 아이콘 ID |
| initial_balance | number | 초기 잔액 |
| current_balance | number/null | 현재 잔액. `include_balance=false`면 null |
| allow_negative_balance | boolean | 마이너스 잔액 허용 여부 |
| negative_balance_limit | number | 마이너스 한도 |
| created_at | string | 생성 시각, UTC ISO-8601 |
| updated_at | string | 최종 수정 시각, UTC ISO-8601 |

---

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 400 | VALIDATION_001 | query parameter 형식 오류 |
| 401 | AUTH_002 | 인증 토큰 없음 또는 유효하지 않음 |
| 401 | AUTH_004 | 토큰 만료 |
| 500 | ACCOUNT_003 | 계좌 목록 조회 실패 |

---

## 프론트 처리 주의사항

- 잔액 표시가 필요 없는 선택 팝업은 `include_balance=false`를 사용할 수 있다.
