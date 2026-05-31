# PWA상태정의

## 1. 문서 목적

본 문서는 미냥이 지갑 PWA에서 사용하는 상태(State)를 정의한다.

PWA는 설치 상태, 네트워크 상태, 동기화 상태, 업데이트 상태를 지속적으로 관리해야 한다.

상태 소유자, 화면 표시 우선순위, 복구 액션, 관련 API 오류코드의 canonical 기준은 `docs/03_screen-spec/상태정의.md`를 따른다. 본 문서는 PWA 관련 상태의 세부 흐름을 보충한다.

본 문서는 다음 문서와 연계된다.

* PWA개요
* 설치정책
* ServiceWorker정의
* 캐시정책
* 오프라인동작정의
* 동기화구조
* 업데이트정책

---

# 2. 상태 관리 개요

미냥이 지갑은 다음 영역의 상태를 관리한다.

| 구분      | 설명           |
| ------- | ------------ |
| 설치 상태   | PWA 설치 여부    |
| 네트워크 상태 | 온라인 / 오프라인   |
| 캐시 상태   | 캐시 준비 여부     |
| 동기화 상태  | 오프라인 데이터 동기화 |
| 업데이트 상태 | 새 버전 적용 여부   |

---

# 3. 상태 구조

예시

```ts
interface PwaState {
  installStatus: InstallStatus
  networkStatus: NetworkStatus
  cacheStatus: CacheStatus
  syncStatus: SyncStatus
  updateStatus: UpdateStatus
}
```

---

# 4. 설치 상태

## 상태 목록

| 상태          | 설명       |
| ----------- | -------- |
| installable | 설치 가능    |
| installed   | 설치 완료    |
| dismissed   | 설치 안내 닫음 |
| unsupported | 설치 미지원   |

---

## installable

설명

```text
설치 가능 상태
```

조건

```text
Manifest 존재
AND
Service Worker 등록 완료
AND
HTTPS 사용
```

UI

```text
설치 배너 표시
```

---

## installed

설명

```text
설치 완료
```

조건

```text
standalone 실행
```

UI

```text
설치 배너 숨김
```

---

## dismissed

설명

```text
사용자가 설치 안내 닫음
```

UI

```text
재노출 대기
```

---

## unsupported

설명

```text
설치 불가 환경
```

예시

```text
구형 브라우저
Service Worker 미지원
```

---

# 5. 설치 상태 흐름

```text
unsupported
      │
      ▼
installable
      │
      ├─ 설치
      ▼
installed

installable
      │
      ├─ 닫기
      ▼
dismissed

dismissed
      │
      ├─ 재노출 조건 충족
      ▼
installable
```

---

# 6. 네트워크 상태

## 상태 목록

| 상태           | 설명              |
| ------------ | --------------- |
| online       | 서버 통신 가능        |
| offline      | 서버 통신 불가        |
| reconnecting | 네트워크 복구 시도 중    |

---

## online

설명

```text
정상 네트워크 상태
```

UI

```text
오프라인 배너 숨김
```

---

## offline

설명

```text
네트워크 없음
```

UI

```text
오프라인 배너 표시
```

메시지

```text
현재 오프라인 상태입니다.
```

---

## reconnecting

설명

```text
네트워크 연결이 감지되어 서버 연결을 재시도 중인 상태
```

조건

```text
offline 상태에서 navigator.onLine 이벤트 발생
AND
아직 서버 응답 확인되지 않음
```

UI

```text
재연결 시도 중 표시
```

처리

```text
Health Check 성공 시 → online 전환
Health Check 실패 시 → offline 유지
```

---

# 7. 네트워크 상태 흐름

```text
online
 ↓
network disconnect
 ↓
offline

offline
 ↓
network restore 감지
 ↓
reconnecting
 ↓
Health Check 성공
 ↓
online

reconnecting
 ↓
Health Check 실패
 ↓
offline
```

---

# 8. 캐시 상태

## 상태 목록

| 상태            | 설명             |
| ------------- | -------------- |
| cache_loading | 캐시 준비중         |
| cache_ready   | 캐시 준비 완료       |
| cache_stale   | 캐시가 만료되어 갱신 필요 |
| cache_error   | 캐시 오류          |

---

## cache_loading

설명

```text
캐시 생성 중
```

발생

```text
최초 설치
앱 시작
```

---

## cache_ready

설명

```text
캐시 사용 가능
```

UI

```text
정상 서비스
```

---

## cache_stale

설명

```text
캐시 데이터가 만료되어 서버에서 최신 데이터를 다시 받아야 하는 상태
```

발생

```text
캐시 만료 시간 초과
Service Worker 버전 업데이트 후
```

처리

```text
online 상태일 경우 → 백그라운드 갱신
offline 상태일 경우 → 만료된 캐시로 서비스 유지 및 사용자 안내
```

---

## cache_error

설명

```text
캐시 생성 실패
```

처리

```text
Network 사용
```

---

# 9. 캐시 상태 흐름

```text
cache_loading
 ↓
cache_ready
```

---

실패

```text
cache_loading
 ↓
cache_error
```

---

# 10. 동기화 상태

## 상태 목록

| 상태           | 설명     |
| ------------ | ------ |
| pending_sync | 동기화 대기 |
| syncing      | 동기화 진행 |
| synced       | 완료     |
| sync_failed  | 실패     |
| sync_conflict | 충돌     |
| duplicate_ignored | 중복 요청 무시 |

---

## pending_sync

설명

```text
오프라인 데이터 존재
```

UI

```text
동기화 대기중
```

---

## syncing

설명

```text
동기화 진행 중
```

UI

```text
동기화 중
```

---

## synced

설명

```text
동기화 완료
```

UI

```text
동기화 완료
```

---

## sync_failed

설명

```text
동기화 실패
```

UI

```text
재시도 가능
```

---

# 11. 동기화 상태 흐름

```text
pending_sync
 ↓
syncing
 ↓
synced
```

---

실패

```text
pending_sync
 ↓
syncing
 ↓
sync_failed
```

---

재시도

```text
sync_failed
 ↓
pending_sync
```

---

# 12. 업데이트 상태

## 상태 목록

| 상태               | 설명                          |
| ---------------- | --------------------------- |
| update_available | 업데이트 가능                     |
| updating         | 적용 중                        |
| update_completed | 완료                          |
| update_failed    | 실패                          |
| update_blocked   | 미동기화 데이터 존재로 업데이트 적용 보류 중   |

---

## update_available

설명

```text
새 버전 발견
```

UI

```text
업데이트 배너 표시
```

---

## updating

설명

```text
업데이트 진행
```

UI

```text
업데이트 중
```

---

## update_completed

설명

```text
업데이트 완료
```

UI

```text
새 버전 적용
```

---

## update_failed

설명

```text
업데이트 실패
```

UI

```text
재시도 가능
```

---

## update_blocked

설명

```text
미동기화 오프라인 데이터가 존재하여 새 Service Worker 활성화를 보류 중인 상태
```

조건

```text
update_available 상태
AND
pending_sync 또는 syncing 상태
```

UI

```text
동기화 완료 후 업데이트 예정 안내
```

처리

```text
동기화 완료(synced) 후 → update_available로 재전환하여 업데이트 진행
```

---

# 13. 업데이트 상태 흐름

```text
update_available
 ↓
updating
 ↓
update_completed
```

---

실패

```text
update_available
 ↓
updating
 ↓
update_failed
```

---

# 14. 전체 상태 흐름

```text
설치
 ├─ installable
 ├─ installed
 └─ dismissed

네트워크
 ├─ online
 ├─ reconnecting
 └─ offline

캐시
 ├─ cache_loading
 ├─ cache_ready
 ├─ cache_stale
 └─ cache_error

동기화
 ├─ pending_sync
 ├─ syncing
 ├─ synced
 ├─ sync_failed
 ├─ sync_conflict
 └─ duplicate_ignored

업데이트
 ├─ update_available
 ├─ update_blocked
 ├─ updating
 ├─ update_completed
 └─ update_failed
```

---

# 15. 상태 우선순위

> **주의:** 이 우선순위는 PWA 내부 상태(설치/네트워크/캐시/동기화/업데이트)에 한정된다.
> 앱 전체 상태 우선순위(인증 만료 `expired` 등 포함)는 `docs/03_screen-spec/상태정의.md`를 따른다.
> 예를 들어 `expired`는 앱 전체 기준으로 최상위 우선순위이며, PWA 상태보다 먼저 처리된다.

동시에 여러 PWA 상태가 발생할 경우 다음 순서로 UI에 표시한다.

```text
update_blocked      ← 업데이트 대기 중 (동기화 우선)
 ↓
update_available
 ↓
sync_failed
 ↓
offline / reconnecting
 ↓
pending_sync
 ↓
cache_stale
 ↓
cache_ready
```

---

예시

```text
offline
 +
pending_sync
```

표시

```text
오프라인 상태
동기화 대기중
```

---

예시

```text
update_available
 +
pending_sync
```

표시

```text
동기화 후 업데이트 가능
```

---

# 16. Zustand 상태 관리 기준

예시

```ts
interface PwaStore {
  installStatus: InstallStatus
  networkStatus: NetworkStatus
  cacheStatus: CacheStatus
  syncStatus: SyncStatus
  updateStatus: UpdateStatus
}
```

---

액션

```ts
setInstallStatus()
setNetworkStatus()
setCacheStatus()
setSyncStatus()
setUpdateStatus()
```

---

# 17. UI 표시 기준

| 상태               | UI              |
| ---------------- | --------------- |
| installable      | 설치 배너           |
| offline          | 오프라인 배너         |
| reconnecting     | 재연결 시도 중 표시     |
| pending_sync     | 동기화 안내          |
| syncing          | 로딩 표시           |
| update_available | 업데이트 배너         |
| update_blocked   | 동기화 완료 후 업데이트 예정 안내 |
| sync_failed      | 오류 안내           |
| update_failed    | 재시도 버튼          |
| cache_stale      | 백그라운드 갱신 중 (조용히 처리) |

---

# 18. 예외 처리

## 상태 불일치

처리

```text
최신 상태 재계산
```

---

## 네트워크 감지 오류

처리

```text
API Health Check
```

---

## Service Worker 오류

처리

```text
cache_error
```

---

## 동기화 오류

처리

```text
sync_failed
```

---

# 19. 관련 문서

* 설치정책
* ServiceWorker정의
* 캐시정책
* 오프라인동작정의
* 동기화구조
* 업데이트정책

---

# 20. 최종 목표

미냥이 지갑의 PWA 상태는 사용자가 현재 앱의 상태를 명확하게 이해할 수 있도록 제공되어야 한다.

최종적으로 다음을 만족해야 한다.

* 설치 상태 관리
* 네트워크 상태 관리
* 캐시 상태 관리
* 동기화 상태 관리
* 업데이트 상태 관리
* UI 자동 연계
* 데이터 손실 방지
* 안정적인 사용자 경험 제공
