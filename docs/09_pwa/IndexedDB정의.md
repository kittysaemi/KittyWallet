# IndexedDB정의

## 1. 문서 목적

본 문서는 미냥이 지갑 PWA에서 사용하는 IndexedDB 구조와 저장 정책을 정의한다.

IndexedDB는 오프라인 환경에서 사용자 데이터를 저장하고, 네트워크 복구 후 서버와 동기화하기 위한 로컬 데이터 저장소이다.

본 문서는 다음 문서와 연계된다.

* ServiceWorker정의
* 캐시정책
* 오프라인동작정의
* 동기화구조
* PWA상태정의

---

# 2. IndexedDB 개요

미냥이 지갑은 다음 저장소를 사용한다.

| 저장소           | 역할          |
| ------------- | ----------- |
| Cache Storage | 조회 데이터 캐시   |
| localStorage  | 비민감 실행 플래그 |
| IndexedDB     | 오프라인 데이터 저장 |

---

IndexedDB 사용 목적

```text
오프라인 거래 저장
동기화 Queue 관리
동기화 이력 저장
설정 저장
```

---

# 3. 데이터베이스 정의

데이터베이스명

```text
kittywallet-db
```

버전

```text
1
```

---

초기 구조

```text
kittywallet-db
 ├─ offline_transactions
 ├─ sync_queue
 ├─ sync_history
 ├─ sync_client
 └─ app_settings
```

---

# 4. Store 정의

## offline_transactions

오프라인 거래 저장소

---

목적

```text
오프라인 거래 등록
오프라인 거래 수정
오프라인 거래 삭제
```

---

Primary Key

```text
local_id
```

---

구조

```ts
{
  local_id: string
  server_id?: string
  client_temp_id: string

  transaction_type: string
  wallet_type: 'ACCOUNT' | 'CARD'
  wallet_id: string
  category_id: string

  amount: number
  memo?: string

  transaction_date: string
  deleted_yn: boolean   // 오프라인 삭제 처리 여부. 삭제 Queue 등록 시 true로 설정

  created_at: string
  updated_at: string
  synced_at?: string

  sync_status: string
}
```

---

Index

```text
sync_status
transaction_date
updated_at
client_temp_id
server_id
```

---

# 5. sync_queue

동기화 대기 데이터

---

목적

```text
CREATE
UPDATE
DELETE
```

동기화 관리

---

Primary Key

```text
queue_id
```

---

구조

```ts
{
  queue_id: string

  local_id: string
  client_temp_id: string

  server_id?: string

  action: 'CREATE' | 'UPDATE' | 'DELETE'

  payload: object

  status: string

  retry_count: number

  created_at: string
  updated_at: string
}
```

---

Index

```text
status
created_at
updated_at
```

---

# 6. sync_history

동기화 이력

---

목적

```text
감사 로그
오류 추적
```

---

Primary Key

```text
history_id
```

---

구조

```ts
{
  history_id: string

  queue_id: string

  action: string

  result: string

  error_message?: string

  synced_at: string
}
```

---

Index

```text
synced_at
result
```

---

# 7. sync_client

클라이언트 식별 정보

---

목적

```text
서버 SYNC_CLIENT와 매핑
중복 동기화 방지
마지막 동기화 시각 저장
```

---

Primary Key

```text
client_id
```

---

구조

```ts
{
  client_id: string
  device_name?: string
  platform: 'WEB' | 'PWA' | 'IOS' | 'ANDROID'
  last_synced_at?: string
  created_at: string
  updated_at: string
}
```

---

Index

```text
last_synced_at
```

---

# 8. app_settings

PWA 로컬 설정

---

목적

```text
설치 상태
동기화 옵션
UI 설정
서버 USER_SETTING과 동기화 가능한 비민감 설정 캐시
```

---

Primary Key

```text
setting_key
```

---

구조

```ts
{
  setting_key: string
  setting_value: string
}
```

---

예시

```json
{
  "setting_key": "installDismissedAt",
  "setting_value": "2026-05-30T10:00:00"
}
```

---

# 9. 거래 저장 정책

## 오프라인 저장

```text
거래 저장
 ↓
offline_transactions
 ↓
sync_queue
```

---

생성 데이터

```text
local_id 생성
client_temp_id 생성
sync_status=pending_sync
```

---

# 10. 거래 수정 정책

미동기화 데이터

```text
offline_transactions 수정
```

---

Queue

```text
추가 생성 안함
```

---

동기화 완료 데이터

```text
UPDATE Queue 생성
```

---

# 11. 거래 삭제 정책

미동기화 거래

```text
offline_transactions 제거
sync_queue 제거
```

---

동기화 완료 거래

```text
DELETE Queue 생성
```

---

# 12. 동기화 상태 정의

| 상태           | 설명 |
| ------------ | -- |
| pending_sync | 대기 |
| syncing      | 진행 |
| synced       | 완료 |
| sync_failed  | 실패 |

---

# 13. Queue 상태 정의

| 상태         | 설명  |
| ---------- | --- |
| waiting    | 대기  |
| processing | 처리중 |
| completed  | 완료  |
| failed     | 실패  |

---

# 14. 서버 매핑 정책

| 로컬 필드 | 서버 필드 | 설명 |
|---|---|---|
| sync_client.client_id | SYNC_CLIENT.client_id | 클라이언트 식별자 |
| offline_transactions.client_temp_id | TRANSACTION.client_temp_id | 중복 방지 키 |
| offline_transactions.server_id | TRANSACTION.transaction_id | 서버 반영 후 매핑 |
| offline_transactions.synced_at | TRANSACTION.synced_at | 서버 반영 완료 일시 |
| sync_history.synced_at | SYNC_HISTORY.server_applied_at | 서버 또는 로컬 반영 이력 |

---

# 15. 저장 용량 정책

최대 저장 기간

```text
90일
```

---

초과 시

```text
오래된 sync_history 삭제
```

---

offline_transactions

```text
삭제 금지
```

---

# 16. 보안 정책

저장 금지

```text
Access Token
Refresh Token
Password
```

---

민감 정보

```text
IndexedDB 저장 금지
```

---

# 17. 예외 처리

DB 생성 실패

```text
오프라인 기능 비활성
```

---

Store 손상

```text
재생성
```

---

Queue 손상

```text
복구 시도
```

---

# 18. 관련 문서

* ServiceWorker정의
* 캐시정책
* 오프라인동작정의
* 동기화구조
* PWA상태정의

---

# 19. 최종 목표

IndexedDB는 미냥이 지갑의 오프라인 기능을 위한 핵심 저장소이다.

최종적으로 다음을 만족해야 한다.

* 거래 저장 가능
* 거래 수정 가능
* 거래 삭제 가능
* Queue 관리 가능
* 동기화 이력 보관
* 데이터 손실 방지
* 오프라인 지원
