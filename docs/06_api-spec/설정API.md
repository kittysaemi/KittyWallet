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


# 설정 API

## 설정 정책 요약

- 사용자별 설정 저장
- 서버 저장 테이블은 `USER_SETTING`
- 앱 재설치 후 복원 가능
- 모바일/PWA 공통 사용
- 민감정보, Access Token, Refresh Token, Password 저장 금지
- 동일 `setting_key` 저장 시 기존 값을 갱신

# 설정 조회 API

## Endpoint

`GET /api/v1/settings`

---

## Query Parameters

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| key | string | N | 없음 | 특정 설정 키만 조회 |

---

## Response

```json
{
  "success": true,
  "data": {
    "settings": {
      "theme": "cat-pink",
      "currency": "KRW",
      "sync_enabled": true,
      "transaction_list_page_size": 20
    },
    "updated_at": "2026-05-30T01:00:00Z"
  },
  "error": null
}
```

---

## Response 필드 정의

| 필드 | 타입 | 설명 |
|---|---|---|
| settings | object | 사용자 설정 key-value 모음 |
| updated_at | string/null | 가장 최근 설정 수정일시 |

---

# 설정 저장 API

## Endpoint

`PUT /api/v1/settings`

---

## Request Body

```json
{
  "settings": {
    "theme": "mint",
    "currency": "KRW",
    "sync_enabled": true,
    "transaction_list_page_size": 20
  }
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| settings | object | Y | 저장할 설정 key-value 모음 |

---

## 저장 가능 설정 키

| key | 타입 | 기본값 | 설명 |
|---|---|---|---|
| theme | string | cat-pink | cat-pink/mint/lavender |
| currency | string | KRW | 표시 통화 |
| sync_enabled | boolean | true | 네트워크 복구 시 자동 동기화 사용 여부 |
| timezone | string | Asia/Seoul | 가계부 날짜 계산 기준 시간대. IANA timezone 식별자. 지원 목록은 `시간대정책.md` 참조 |
| transaction_list_page_size | number | 20 | 거래내역 페이지네이션 정책 확정 전까지 화면에 노출하지 않는 호환/예약 설정 |

과거 저장값인 `system`, `light`, `dark`는 조회 시 `cat-pink`로 보정한다.

---

## Response

```json
{
  "success": true,
  "data": {
    "settings": {
      "theme": "mint",
      "currency": "KRW",
      "sync_enabled": true,
      "transaction_list_page_size": 20
    },
    "updated_at": "2026-05-30T01:10:00Z"
  },
  "error": null
}
```

---

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 400 | SETTING_001 | 지원하지 않는 설정 키 또는 값 형식 오류 |
| 401 | AUTH_002 | 인증 실패 또는 토큰 만료 |
| 500 | SETTING_002 | 설정 저장 실패 |

---

## 데이터 저장 기준

| API 필드 | 서버 테이블 | 컬럼 |
|---|---|---|
| settings.{key} | USER_SETTING | setting_key |
| settings.{value} | USER_SETTING | setting_value |
| 로그인 사용자 | USER_SETTING | user_id |

`USER_SETTING`은 `(user_id, setting_key)` unique 기준으로 upsert 처리한다.
