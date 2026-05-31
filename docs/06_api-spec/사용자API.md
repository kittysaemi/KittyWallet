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


# 사용자 API

## 사용자 정책 요약

- 사용자별 데이터 완전 분리
- 탈퇴 시 Soft Delete 처리
- 인증 사용자만 접근 가능

# 내 정보 조회 API

## Endpoint

`GET /api/v1/users/me`

---

## Header

| 이름 | 필수 | 설명 |
|---|---|---|
| Authorization | Y | `Bearer {access_token}` |

---

## Response

```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "email": "meow@example.com",
    "nickname": "미냥이",
    "created_at": "2026-05-30T02:00:00Z",
    "updated_at": "2026-05-30T02:00:00Z"
  },
  "error": null
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| user_id | number | 사용자 ID |
| email | string | 로그인 이메일 |
| nickname | string | 화면 표시 닉네임 |
| created_at | string | 사용자 생성 시각, UTC ISO-8601 |
| updated_at | string | 사용자 정보 최종 수정 시각, UTC ISO-8601 |

---

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 401 | AUTH_002 | 인증 토큰 없음 또는 유효하지 않음 |
| 401 | AUTH_004 | 토큰 만료 |
| 403 | AUTH_003 | 비활성 사용자 |
| 404 | USER_001 | 사용자 없음 |

---

## 프론트 처리 주의사항

- 앱 초기화, 설정 화면, 프로필 화면에서 공통 사용자 상태를 갱신할 때 사용한다.
- 401 응답은 토큰 재발급 API를 먼저 시도하고, 재발급 실패 시 로그인 화면으로 이동한다.
- 403 또는 404 응답은 로컬 인증 상태와 사용자 캐시를 제거하고 재로그인을 요구한다.

# 닉네임 수정 API

## Endpoint

`PUT /api/v1/users/profile`

---

## Request Body

```json
{
  "nickname": "미냥이"
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| nickname | string | Y | 변경할 닉네임. 공백 제거 후 1~30자 |

---

## Response

```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "nickname": "미냥이",
    "updated_at": "2026-05-30T02:10:00Z"
  },
  "error": null
}
```

---

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 400 | VALIDATION_001 | 닉네임 누락 또는 형식 오류 |
| 401 | AUTH_002 | 인증 토큰 없음 또는 유효하지 않음 |
| 401 | AUTH_004 | 토큰 만료 |
| 403 | AUTH_003 | 비활성 사용자 |
| 404 | USER_001 | 사용자 없음 |
| 500 | USER_002 | 사용자 정보 수정 실패 |

---

## 프론트 처리 주의사항

- 저장 성공 시 전역 사용자 상태와 프로필 화면의 닉네임을 즉시 갱신한다.
- 입력 중에는 앞뒤 공백을 허용하더라도 제출 전 trim 기준으로 검증한다.
- 네트워크 실패 시 기존 닉네임을 유지하고 재시도 액션을 제공한다.

# 회원 탈퇴 API

## Endpoint

`DELETE /api/v1/users/me`

---

## Request Body

```json
{
  "confirm_text": "탈퇴"
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| confirm_text | string | Y | 오동작 방지를 위한 확인 문구. 값은 `탈퇴` |

---

## Response

```json
{
  "success": true,
  "data": {
    "withdrawn": true,
    "withdrawn_at": "2026-05-30T02:20:00Z"
  },
  "error": null
}
```

---

## 처리 정책

| 항목 | 처리 기준 |
|---|---|
| 삭제 방식 | 사용자 레코드는 Soft Delete 처리 |
| 토큰 처리 | Access Token과 Refresh Token 모두 폐기 |
| 사용자 데이터 | MVP에서는 물리 삭제하지 않고 사용자 기준으로 접근 차단 |
| 미동기화 데이터 | pending Sync Queue가 있으면 탈퇴 요청 전에 동기화를 완료해야 함 |

---

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 400 | VALIDATION_001 | 확인 문구 누락 또는 형식 오류 |
| 401 | AUTH_002 | 인증 토큰 없음 또는 유효하지 않음 |
| 401 | AUTH_004 | 토큰 만료 |
| 403 | AUTH_003 | 비활성 사용자 |
| 404 | USER_001 | 사용자 없음 |
| 409 | USER_003 | 미동기화 데이터 존재 등 탈퇴 처리 불가 |

---

## 프론트 처리 주의사항

- 탈퇴 버튼 노출 전 pending Sync Queue 개수를 확인하고, 1건 이상이면 동기화 완료 후 다시 시도하도록 안내한다.
- 성공 시 로컬 인증 정보, 사용자 캐시, 화면 상태를 제거하고 시작 화면으로 이동한다.
- IndexedDB 거래 데이터 삭제는 PWA 데이터 보존 정책을 따른다.
