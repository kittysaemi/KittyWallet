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


# 동기화 API

## 동기화 정책 요약

- Offline First 구조
- 로컬 우선 저장
- 거래 등록/수정/삭제 Queue 기반 동기화
- 충돌 발생 시 **클라이언트 데이터 우선** 반영. 사용자에게 선택지 제공하지 않음
- deleted_yn 동기화 지원
- MVP 동기화 대상은 거래만 지원
- `client_id`와 `client_temp_id` 기준 중복 생성 방지
- 서버 반영 이력은 `SYNC_HISTORY`에 기록
- 클라이언트별 마지막 동기화 시점은 `SYNC_CLIENT.last_synced_at`으로 관리

# 업로드 API

## Endpoint

`POST /api/v1/sync/upload`

---

## Request Body

```json
{
  "client_id": "pwa-install-uuid",
  "device_name": "Chrome Android",
  "platform": "PWA",
  "items": [
    {
      "client_temp_id": "txn_local_1001",
      "server_id": null,
      "sync_action": "CREATE",
      "payload": {
        "wallet_type": "ACCOUNT",
        "wallet_id": 1,
        "category_id": 3,
        "transaction_type": "EXPENSE",
        "amount": 15000,
        "memo": "점심 식사",
        "transaction_date": "2026-05-29",
        "deleted_yn": false,
        "updated_at": "2026-05-29T03:20:00Z"
      }
    }
  ]
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| client_id | string | Y | 브라우저/앱 설치 단위 클라이언트 식별자 |
| device_name | string | N | 사용자 또는 운영자가 식별 가능한 기기명 |
| platform | string | N | WEB/PWA/IOS/ANDROID 등 플랫폼 |
| items | array | Y | 동기화할 거래 Queue 목록 |
| items.client_temp_id | string | Y | 클라이언트 임시 거래 ID |
| items.server_id | number/null | N | 서버에 이미 반영된 거래 ID |
| items.sync_action | string | Y | CREATE/UPDATE/DELETE |
| items.payload | object | Y | 거래 데이터 |

---

## Response

```json
{
  "success": true,
  "data": {
    "client_id": "pwa-install-uuid",
    "last_synced_at": "2026-05-30T01:10:00Z",
    "results": [
      {
        "client_temp_id": "txn_local_1001",
        "transaction_id": 501,
        "sync_action": "CREATE",
        "sync_result": "SUCCESS",
        "server_updated_at": "2026-05-30T01:10:00Z",
        "error": null
      }
    ]
  },
  "error": null
}
```

---

## 서버 저장 기준

| 데이터 | 저장 위치 | 기준 |
|---|---|---|
| client_id, device_name, platform | SYNC_CLIENT | `(user_id, client_id)` upsert |
| last_synced_at | SYNC_CLIENT | 업로드 전체 성공 또는 부분 성공 시 갱신 |
| client_temp_id | TRANSACTION | 오프라인 CREATE 중복 방지 |
| sync_client_id | TRANSACTION | 업로드 클라이언트 식별 |
| synced_at | TRANSACTION | 서버 반영 성공 시점 |
| 업로드 결과 | SYNC_HISTORY | 항목별 SUCCESS/FAILED/CONFLICT 기록 |

---

## 중복 방지 정책

서버는 `CREATE` 처리 시 `(user_id, sync_client_id, client_temp_id)` 기준으로 기존 거래를 조회한다.

| 상황 | 처리 |
|---|---|
| 동일 client_temp_id 거래 없음 | 신규 거래 생성 |
| 동일 client_temp_id 거래 존재 | 신규 생성하지 않고 기존 transaction_id 반환 |
| payload updated_at이 서버보다 최신 | 클라이언트 데이터를 서버에 반영(덮어쓰기) |
| payload updated_at이 서버보다 과거 | 클라이언트 데이터를 서버에 반영(클라이언트 우선). `SYNC_HISTORY`에 CONFLICT로 기록 후 처리 |

---

## 오류 처리

| HTTP Status | 코드 | 설명 |
|---|---|---|
| 400 | VALIDATION_001 | 필수 필드 누락 또는 형식 오류 |
| 401 | AUTH_002 | 인증 실패 또는 토큰 만료 |
| 409 | SYNC_002 | updated_at 기준 충돌 |
| 409 | SYNC_003 | 중복 요청 감지 후 처리 필요 |
| 500 | SYNC_001 | 동기화 실패 |

# 다운로드 API

## Endpoint

`GET /api/v1/sync/download`

---

## Query Parameters

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| client_id | string | Y | - | 클라이언트 식별자 |
| since | string | N | 없음 | 마지막 동기화 이후 변경분 기준 시각 |

---

## Response

```json
{
  "success": true,
  "data": {
    "client_id": "pwa-install-uuid",
    "server_time": "2026-05-30T01:20:00Z",
    "last_synced_at": "2026-05-30T01:20:00Z",
    "transactions": [
      {
        "transaction_id": 501,
        "client_temp_id": "txn_local_1001",
        "wallet_type": "ACCOUNT",
        "wallet_id": 1,
        "category_id": 3,
        "transaction_type": "EXPENSE",
        "amount": 15000,
        "memo": "점심 식사",
        "transaction_date": "2026-05-29",
        "deleted_yn": false,
        "updated_at": "2026-05-30T01:10:00Z",
        "synced_at": "2026-05-30T01:10:00Z"
      }
    ]
  },
  "error": null
}
```

---

## 동기화 처리 흐름

1. 로컬 저장
2. Sync Queue 등록
3. 서버 업로드
4. 결과 반영
5. 충돌 데이터 처리

---

## Sync Action 정책

| sync_action | 대상 | 처리 |
|---|---|---|
| CREATE | 오프라인 신규 거래 | 서버 거래 생성 |
| UPDATE | 서버 반영 완료 거래 수정 | 서버 거래 수정 |
| DELETE | 서버 반영 완료 거래 삭제 | deleted_yn 기준 Soft Delete |

---

## Queue 정리 정책

| 상황 | 처리 |
|---|---|
| 미동기화 CREATE 거래 수정 | CREATE Queue payload 갱신 |
| 미동기화 CREATE 거래 삭제 | CREATE Queue 제거 |
| UPDATE 대기 중 DELETE 발생 | UPDATE Queue 제거 후 DELETE Queue 생성 |
| DELETE 대기 중 UPDATE 발생 | UPDATE Queue 생성 금지 |
| 동기화 성공 | 해당 Queue 제거 또는 sync_history 기록 |

서버에는 `SYNC_HISTORY`로 반영 이력을 저장하고, 클라이언트 IndexedDB에는 `sync_history` store로 로컬 실행 이력을 저장한다.

---

## 프론트 처리 주의사항

- Sync 상태 표시 필요
- 재시도 큐 유지 필요
- `SYNC_002(sync_conflict)` 응답 수신 시 클라이언트 데이터를 서버에 강제 반영하도록 재전송 처리. 사용자에게 충돌 선택 UI는 표시하지 않음
- 강제 반영 성공 후 `sync_status`를 `synced`로 업데이트하고 화면을 최신 서버 데이터로 갱신
