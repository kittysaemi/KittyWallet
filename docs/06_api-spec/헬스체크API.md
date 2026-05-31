# 문서 개요

## 문서 목적

본 문서는 미냥이 지갑 서비스의 헬스체크 API 규격을 정의한다.
CI/CD 배포 검증, PWA `reconnecting` 상태 확인, 운영 체크리스트 자동화의 기준 API로 사용한다.

## 관련 문서

- 공통응답규격.md
- 배포절차.md
- 운영아키텍처.md
- 상태정의.md (Network State - reconnecting)

---

# 기본 정보

| 항목 | 내용 |
|---|---|
| Base URL | /api/v1 |
| 인증 | 불필요 (공개 엔드포인트) |
| 캐시 | 금지 (`Cache-Control: no-store`) |

---

# 서버 상태 확인 API

## 목적

서버 프로세스 기동 여부를 확인한다. PWA `reconnecting` 상태의 헬스체크 기준 API로 사용한다.

## Endpoint

`GET /health`

---

## Request

- Request Body 없음
- 인증 헤더 불필요

---

## Response (정상)

```http
HTTP/1.1 200 OK
Cache-Control: no-store
Content-Type: application/json
```

```json
{
  "status": "ok",
  "timestamp": "2026-05-31T00:00:00Z"
}
```

---

## Response (비정상)

```http
HTTP/1.1 503 Service Unavailable
Cache-Control: no-store
Content-Type: application/json
```

```json
{
  "status": "error",
  "timestamp": "2026-05-31T00:00:00Z"
}
```

---

## 처리 정책

- 서버 프로세스가 응답 가능한 상태면 200을 반환한다.
- 응답 body는 공통응답규격(`success`, `data`, `error`)을 따르지 않는다. 외부 모니터링 도구 호환성을 위해 단순 JSON 형태를 사용한다.
- 응답 헤더에 `Cache-Control: no-store`를 포함한다. CDN, 브라우저, PWA Service Worker 캐시를 방지한다.
- Service Worker는 `GET /health` 응답을 캐시하지 않는다.

---

# DB 연결 상태 확인 API

## 목적

서버와 데이터베이스 연결 상태를 확인한다. CI/CD 배포 후 검증 및 운영 체크리스트 자동화에 사용한다.

## Endpoint

`GET /health/db`

---

## Request

- Request Body 없음
- 인증 헤더 불필요

---

## Response (정상)

```http
HTTP/1.1 200 OK
Cache-Control: no-store
Content-Type: application/json
```

```json
{
  "status": "ok",
  "db": "connected",
  "timestamp": "2026-05-31T00:00:00Z"
}
```

---

## Response (DB 연결 실패)

```http
HTTP/1.1 503 Service Unavailable
Cache-Control: no-store
Content-Type: application/json
```

```json
{
  "status": "error",
  "db": "disconnected",
  "timestamp": "2026-05-31T00:00:00Z"
}
```

---

## 처리 정책

- DB 연결 확인은 경량 쿼리(예: `SELECT 1`)로 수행한다.
- DB 연결 실패 시 HTTP 503을 반환한다.
- 응답 헤더에 `Cache-Control: no-store`를 포함한다.
- CI/CD 파이프라인에서 배포 후 `GET /health/db` 응답이 200이면 배포 성공으로 판단한다.

---

# 사용 기준

| 사용처 | 엔드포인트 | 기준 |
|---|---|---|
| PWA `reconnecting` 상태 확인 | `GET /health` | 200 응답 시 `online`으로 전환 |
| CI/CD 배포 후 자동 검증 | `GET /health/db` | 200 응답 시 배포 성공 |
| 운영 체크리스트 자동화 | `GET /health/db` | 200 응답 시 정상 |
| 외부 모니터링 도구 | `GET /health` | 200/503 기준 알림 |

---

# 보안 주의사항

- 두 엔드포인트는 인증 없이 공개되므로 민감 정보를 응답 body에 포함하지 않는다.
- 서버 내부 오류 메시지, 스택 트레이스, 환경 변수를 노출하지 않는다.
- DB 연결 실패 사유는 503 status와 `db: disconnected`만 반환한다.
