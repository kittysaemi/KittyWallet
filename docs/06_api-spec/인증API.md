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


# 인증 API

## 인증 정책 요약

- JWT 기반 인증 사용
- Access Token + Refresh Token 구조
- Bearer Token Header 사용
- 사용자별 데이터 접근 제한
- 토큰 만료 시 재발급 처리

## 토큰 저장 방식 (MVP 확정)

| 토큰 | 저장 위치 | 이유 |
|---|---|---|
| Access Token | 메모리(in-memory) | XSS 공격 노출 최소화 |
| Refresh Token | `httpOnly Secure SameSite=Strict` cookie | JS 접근 차단, CSRF 방지 |

- Refresh Token은 서버가 `Set-Cookie` 응답 헤더로 발급하며 JS에서 직접 접근 불가
- Access Token은 메모리에만 보관하며 페이지 새로고침 시 Refresh Token cookie로 재발급
- IndexedDB, localStorage, sessionStorage에 토큰을 저장하지 않는다
- logout 및 refresh 요청 시 Refresh Token은 request body가 아닌 cookie로 전달된다

---

# 공통 Header

```http
Authorization: Bearer {access_token}
```

---

# 로그인 API

## 목적

사용자 로그인 및 Access Token 발급 처리.

## Endpoint

`POST /api/v1/auth/login`

---

## Request Body

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

---

## Validation 규칙

| 항목 | 규칙 |
|---|---|
| email | 이메일 형식 |
| password | 공백 불가 |

---

## Response

```json
{
  "success": true,
  "data": {
    "access_token": "jwt-access-token",
    "user": {
      "user_id": 1,
      "nickname": "미냥이"
    }
  },
  "error": null
}
```

> Refresh Token은 응답 body에 포함하지 않는다. 서버가 `Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict` 헤더로 발급한다.

---

## 예외 처리

| 코드 | 설명 |
|---|---|
| AUTH_002 | 이메일 또는 비밀번호 불일치 |
| AUTH_003 | 비활성 사용자 |

---

## 프론트 처리 주의사항

- Access Token은 메모리에만 보관한다 (localStorage, IndexedDB 저장 금지)
- Refresh Token은 서버가 `httpOnly Secure SameSite=Strict` cookie로 발급하며, 프론트에서 직접 다루지 않는다
- 로그인 성공 시 응답 body에 `refresh_token` 필드는 없으며, `Set-Cookie` 헤더를 통해 자동 저장된다
- Access Token 만료 시 API Client에서 자동으로 `/auth/refresh`를 호출하여 재발급 처리한다
- 로그인 실패 메시지 노출 제한

---

# 로그아웃 API

## 목적

서버에 저장된 Refresh Token을 폐기하고 클라이언트 인증 상태를 종료한다.

## Endpoint

`POST /api/v1/auth/logout`

---

## Header

```http
Authorization: Bearer {access_token}
```

---

## Request

- Request Body 없음
- Refresh Token은 `httpOnly` cookie로 자동 전송된다

---

## Response

```json
{
  "success": true,
  "data": null,
  "error": null
}
```

응답 시 서버는 `Set-Cookie`로 Refresh Token cookie를 만료 처리(`Max-Age=0`)한다.

---

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 401 | AUTH_004 | 유효하지 않거나 만료된 토큰 |
| 500 | AUTH_006 | 로그아웃 처리 실패 |

---

## 처리 정책

- Refresh Token은 cookie로 전달되며 서버가 폐기 후 cookie를 만료 처리한다.
- 로그아웃 API 실패 시에도 프론트엔드는 메모리의 Access Token을 삭제한다.
- 로그아웃 후 사용자별 API 캐시와 대시보드 캐시는 삭제한다.

---

# 토큰 재발급 API

## 목적

유효한 Refresh Token으로 새 Access Token을 발급한다.

## Endpoint

`POST /api/v1/auth/refresh`

---

## Request

- Request Body 없음
- Refresh Token은 `httpOnly` cookie로 자동 전송된다

---

## Response

```json
{
  "success": true,
  "data": {
    "access_token": "new-jwt-access-token"
  },
  "error": null
}
```

---

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 401 | AUTH_004 | Refresh Token 만료 또는 유효하지 않음 |

---

## 처리 정책

- Refresh Token은 cookie로 전달되므로 request body에 포함하지 않는다.
- Access Token 만료 시 프론트엔드 공통 API Client에서 1회 재발급을 시도한다.
- 재발급 실패 시 인증 상태를 초기화하고 로그인 화면으로 이동한다.
- Refresh Token 회전 정책을 적용하는 경우 새 Refresh Token은 `Set-Cookie`로 갱신 발급하며, API 문서를 먼저 개정한다.

---

# 회원가입 API

## 목적

이메일 기반 신규 사용자를 생성한다.

## Endpoint

`POST /api/v1/auth/signup`

---

## Request Body

```json
{
  "email": "user@example.com",
  "password": "password123",
  "password_confirm": "password123",
  "nickname": "미냥이"
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| email | string | Y | 로그인에 사용할 이메일 |
| password | string | Y | 비밀번호 |
| password_confirm | string | Y | 비밀번호 확인 |
| nickname | string | Y | 화면에 표시할 사용자 이름 |

---

## Validation 규칙

| 항목 | 규칙 |
|---|---|
| email | 이메일 형식, 중복 불가 |
| password | 공백 불가, 최소 8자 |
| password_confirm | password와 동일 |
| nickname | 공백 불가, 최대 30자 |

---

## Response

```json
{
  "success": true,
  "data": {
    "user_id": 1
  },
  "error": null
}
```

---

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 400 | VALIDATION_001 | 필수값 누락 또는 형식 오류 |
| 400 | AUTH_005 | 비밀번호 확인 불일치 |
| 409 | AUTH_001 | 이미 가입된 이메일 |

---

## 처리 정책

- 비밀번호는 bcrypt 해시로 저장한다.
- 회원가입 성공 후 자동 로그인 여부는 프론트 정책에서 결정하되, 본 API는 토큰을 반환하지 않는다.
- 동일 이메일 중복 여부는 사용자 단위 전역 기준으로 검증한다.

---

# 비밀번호 재설정 요청 API

## 목적

사용자 이메일로 비밀번호 재설정 링크(reset_token 포함)를 발송한다.

## Endpoint

`POST /api/v1/auth/request-reset-password`

---

## Request Body

```json
{
  "email": "user@example.com"
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| email | string | Y | 비밀번호를 재설정할 계정 이메일 |

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

## 처리 정책

- 입력된 이메일이 존재하는 계정인 경우 해당 이메일로 재설정 링크를 발송한다.
- 입력된 이메일이 존재하지 않는 계정인 경우에도 동일한 성공 응답을 반환한다 (계정 존재 여부 노출 방지).
- reset_token 유효 시간: **30분**. 만료 후에는 재요청이 필요하다.
- reset_token은 서버 DB(`USER` 테이블의 `reset_token`, `reset_token_expires_at` 컬럼)에 저장한다.
- 새로운 재설정 요청 시 기존 reset_token은 무효화된다.
- 이메일 발송은 서버 이메일 서비스(SMTP 또는 외부 메일 서비스)를 통해 처리한다.

---

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 400 | VALIDATION_001 | 이메일 형식 오류 |
| 429 | AUTH_010 | 재설정 요청 횟수 초과 |

---

# 비밀번호 재설정 API

## 목적

사용자가 이메일 확인 후 새 비밀번호로 변경할 수 있도록 처리한다.

## Endpoint

`POST /api/v1/auth/reset-password`

---

## Request Body

```json
{
  "email": "user@example.com",
  "reset_token": "password-reset-token",
  "new_password": "newPassword123",
  "new_password_confirm": "newPassword123"
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| email | string | Y | 비밀번호를 재설정할 사용자 이메일 |
| reset_token | string | Y | 이메일 인증 또는 재설정 요청으로 발급된 토큰 |
| new_password | string | Y | 새 비밀번호 |
| new_password_confirm | string | Y | 새 비밀번호 확인 |

---

## Validation 규칙

| 항목 | 규칙 |
|---|---|
| email | 이메일 형식 |
| reset_token | 공백 불가 |
| new_password | 공백 불가, 최소 8자 |
| new_password_confirm | new_password와 동일 |

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
| 400 | VALIDATION_001 | 필수값 누락 또는 형식 오류 |
| 400 | AUTH_005 | 비밀번호 확인 불일치 |
| 401 | AUTH_007 | reset_token 만료 또는 유효하지 않음 |
| 404 | AUTH_008 | 비밀번호 재설정 대상 사용자 없음 |

---

## 처리 정책

- 비밀번호 재설정은 온라인 전용 기능이다.
- 재설정 성공 시 기존 Refresh Token을 모두 폐기한다.
- 계정 존재 여부를 과도하게 노출하지 않도록 화면 메시지는 일반화할 수 있다.
