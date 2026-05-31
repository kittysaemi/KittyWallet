# PWA폴더구조

## 1. 문서 목적

본 문서는 미냥이 지갑 PWA 기능 구현을 위한 프론트엔드 폴더 구조와 각 파일의 책임을 정의한다.

PWA 기능은 단순히 Service Worker 파일 하나로 처리하지 않는다.

미냥이 지갑은 다음 기능을 분리하여 관리한다.

* Manifest 설정
* Service Worker 등록
* Workbox 캐시 전략
* IndexedDB 저장소
* 오프라인 거래 저장
* Sync Queue
* PWA 상태 관리
* 업데이트 처리
* 설치 상태 관리

본 문서는 다음 문서와 연계된다.

* PWA개요
* Manifest정의
* ServiceWorker정의
* 캐시정책
* 오프라인동작정의
* 동기화구조
* PWA상태정의
* IndexedDB정의
* Workbox전략정의

---

# 2. PWA 폴더 구조 원칙

## 원칙 1

PWA 관련 코드는 `src/pwa` 하위에 모아 관리한다.

---

## 원칙 2

Service Worker 실행 코드와 앱 내부 상태 관리 코드는 분리한다.

---

## 원칙 3

IndexedDB 접근 코드는 직접 호출하지 않고 Repository 또는 Service를 통해 접근한다.

---

## 원칙 4

캐시 전략은 Workbox 설정 파일에서 관리한다.

---

## 원칙 5

설치, 오프라인, 동기화, 업데이트 상태는 PWA Store에서 통합 관리한다.

---

# 3. 전체 폴더 구조

```text
src
 ├─ pwa
 │   ├─ manifest
 │   ├─ service-worker
 │   ├─ workbox
 │   ├─ cache
 │   ├─ indexed-db
 │   ├─ offline
 │   ├─ sync
 │   ├─ install
 │   ├─ update
 │   ├─ state
 │   └─ types
```

---

# 4. 상세 구조

```text
src/pwa
 ├─ manifest
 │   └─ manifest.config.ts
 │
 ├─ service-worker
 │   ├─ registerServiceWorker.ts
 │   ├─ serviceWorkerEvents.ts
 │   └─ serviceWorkerMessages.ts
 │
 ├─ workbox
 │   ├─ workbox.config.ts
 │   ├─ runtimeCaching.ts
 │   └─ cacheNames.ts
 │
 ├─ cache
 │   ├─ cachePolicy.ts
 │   ├─ cacheInvalidation.ts
 │   └─ cacheStorage.service.ts
 │
 ├─ indexed-db
 │   ├─ indexedDb.config.ts
 │   ├─ indexedDb.client.ts
 │   ├─ indexedDb.schema.ts
 │   └─ repositories
 │       ├─ offlineTransaction.repository.ts
 │       ├─ syncQueue.repository.ts
 │       ├─ syncHistory.repository.ts
 │       └─ appSettings.repository.ts
 │
 ├─ offline
 │   ├─ offlineDetector.ts
 │   ├─ offlineTransaction.service.ts
 │   └─ offlineMessage.ts
 │
 ├─ sync
 │   ├─ syncQueue.service.ts
 │   ├─ syncRunner.ts
 │   ├─ syncConflictResolver.ts
 │   └─ syncStatus.mapper.ts
 │
 ├─ install
 │   ├─ installPrompt.service.ts
 │   ├─ installStatus.detector.ts
 │   └─ installPolicy.ts
 │
 ├─ update
 │   ├─ updateDetector.ts
 │   ├─ updatePrompt.service.ts
 │   └─ updatePolicy.ts
 │
 ├─ state
 │   ├─ pwa.store.ts
 │   ├─ pwa.selectors.ts
 │   └─ pwa.actions.ts
 │
 └─ types
     ├─ pwa.types.ts
     ├─ sync.types.ts
     ├─ cache.types.ts
     └─ indexedDb.types.ts
```

---

# 5. manifest 폴더

## 역할

Manifest 설정을 관리한다.

## 파일

```text
manifest.config.ts
```

## 책임

* 앱 이름 정의
* short_name 정의
* 아이콘 경로 정의
* theme_color 정의
* background_color 정의
* display 모드 정의
* start_url 정의

## 연결 문서

* Manifest정의
* 설치정책

---

# 6. service-worker 폴더

## 역할

Service Worker 등록과 브라우저 이벤트 연결을 담당한다.

## 파일

```text
registerServiceWorker.ts
serviceWorkerEvents.ts
serviceWorkerMessages.ts
```

---

## registerServiceWorker.ts

책임

* Service Worker 등록
* 등록 성공 처리
* 등록 실패 처리
* unsupported 상태 전환

---

## serviceWorkerEvents.ts

책임

* install 이벤트
* activate 이벤트
* fetch 이벤트
* update 이벤트
* online/offline 이벤트 연결

---

## serviceWorkerMessages.ts

책임

* Service Worker와 앱 간 메시지 통신
* update_available 전달
* cache_ready 전달
* sync 상태 전달

---

# 7. workbox 폴더

## 역할

Workbox 캐시 전략을 정의한다.

## 파일

```text
workbox.config.ts
runtimeCaching.ts
cacheNames.ts
```

---

## workbox.config.ts

책임

* Vite PWA Plugin Workbox 설정 정의
* `registerType`
* `skipWaiting`
* `clientsClaim`
* `cleanupOutdatedCaches`

---

## runtimeCaching.ts

책임

* API별 캐시 전략 정의
* Dashboard Network First
* Statistics Stale While Revalidate
* Image Cache First
* Font Cache First

---

## cacheNames.ts

책임

* 캐시 이름 상수 관리
* 버전별 캐시 이름 관리

예시

```ts
export const CACHE_NAMES = {
  APP_SHELL: 'kittywallet-app-shell',
  DASHBOARD: 'kittywallet-dashboard-api',
  STATISTICS: 'kittywallet-statistics-api',
  ACCOUNTS: 'kittywallet-accounts-api',
  CARDS: 'kittywallet-cards-api',
  CATEGORIES: 'kittywallet-categories-api',
}
```

---

# 8. cache 폴더

## 역할

캐시 정책, 캐시 무효화, Cache Storage 접근을 담당한다.

## 파일

```text
cachePolicy.ts
cacheInvalidation.ts
cacheStorage.service.ts
```

---

## cachePolicy.ts

책임

* 캐시 TTL 정의
* 캐시 대상 정의
* 저장 금지 대상 정의

---

## cacheInvalidation.ts

책임

* 거래 저장 후 Dashboard 캐시 무효화
* 거래 수정 후 Statistics 캐시 무효화
* 계좌 수정 후 Account 캐시 무효화
* 로그아웃 시 사용자 API 캐시 삭제

---

## cacheStorage.service.ts

책임

* Cache Storage 직접 접근
* 캐시 삭제
* 캐시 목록 조회
* 캐시 초기화

---

# 9. indexed-db 폴더

## 역할

IndexedDB 연결, Schema, Repository를 관리한다.

## 파일

```text
indexedDb.config.ts
indexedDb.client.ts
indexedDb.schema.ts
repositories
```

---

## indexedDb.config.ts

책임

* DB 이름 정의
* DB 버전 정의
* Store 이름 정의

---

## indexedDb.client.ts

책임

* IndexedDB 연결
* DB Open
* Version Upgrade 처리
* 공통 Transaction 처리

---

## indexedDb.schema.ts

책임

* Store 구조 정의
* Index 정의
* Migration 정의

---

## repositories

책임

* Store별 데이터 접근
* IndexedDB 직접 접근 캡슐화

Repository 목록

```text
offlineTransaction.repository.ts
syncQueue.repository.ts
syncHistory.repository.ts
appSettings.repository.ts
```

---

# 10. offline 폴더

## 역할

오프라인 감지와 오프라인 거래 저장 처리를 담당한다.

## 파일

```text
offlineDetector.ts
offlineTransaction.service.ts
offlineMessage.ts
```

---

## offlineDetector.ts

책임

* navigator.onLine 감지
* API Health Check
* online/offline 상태 전환

---

## offlineTransaction.service.ts

책임

* 오프라인 거래 저장
* 오프라인 거래 수정
* 오프라인 거래 삭제
* Sync Queue 등록

---

## offlineMessage.ts

책임

* 오프라인 안내 메시지 관리
* 화면별 제한 기능 메시지 관리

---

# 11. sync 폴더

## 역할

오프라인 저장 데이터와 서버 데이터 동기화를 담당한다.

## 파일

```text
syncQueue.service.ts
syncRunner.ts
syncConflictResolver.ts
syncStatus.mapper.ts
```

---

## syncQueue.service.ts

책임

* Queue 생성
* Queue 조회
* Queue 상태 변경
* Queue 삭제

---

## syncRunner.ts

책임

* 네트워크 복구 시 동기화 실행
* CREATE / UPDATE / DELETE 순서 처리
* 재시도 처리
* 동기화 완료 후 캐시 무효화

---

## syncConflictResolver.ts

책임

* updated_at 기준 충돌 처리
* 서버 우선 / 클라이언트 우선 판단
* 충돌 결과 반환

---

## syncStatus.mapper.ts

책임

* Queue 상태를 PWA 상태로 변환
* `pending_sync`
* `syncing`
* `synced`
* `sync_failed`

---

# 12. install 폴더

## 역할

PWA 설치 상태와 설치 프롬프트를 관리한다.

## 파일

```text
installPrompt.service.ts
installStatus.detector.ts
installPolicy.ts
```

---

## installPrompt.service.ts

책임

* beforeinstallprompt 이벤트 저장
* 설치 버튼 클릭 시 브라우저 설치 UI 호출
* 설치 결과 처리

---

## installStatus.detector.ts

책임

* standalone 실행 여부 확인
* iOS standalone 여부 확인
* installed 상태 판단

---

## installPolicy.ts

책임

* 설치 배너 노출 조건
* dismissed 상태 재노출 기준
* unsupported 처리 기준

---

# 13. update 폴더

## 역할

PWA 업데이트 상태와 적용 정책을 관리한다.

## 파일

```text
updateDetector.ts
updatePrompt.service.ts
updatePolicy.ts
```

---

## updateDetector.ts

책임

* 새 Service Worker 감지
* update_available 상태 전환

---

## updatePrompt.service.ts

책임

* 업데이트 배너 표시 제어
* 업데이트 버튼 처리
* 적용 실패 처리

---

## updatePolicy.ts

책임

* Sync Queue 존재 여부 확인
* 강제 업데이트 차단
* 캐시 버전 정책 적용

---

# 14. state 폴더

## 역할

PWA 상태를 Zustand Store로 관리한다.

## 파일

```text
pwa.store.ts
pwa.selectors.ts
pwa.actions.ts
```

---

## pwa.store.ts

책임

* 설치 상태
* 네트워크 상태
* 캐시 상태
* 동기화 상태
* 업데이트 상태

---

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

## pwa.selectors.ts

책임

* UI에서 필요한 상태 선택
* 설치 배너 표시 여부
* 오프라인 배너 표시 여부
* 업데이트 배너 표시 여부

---

## pwa.actions.ts

책임

* 상태 변경 액션 관리
* Service Worker 이벤트 수신 후 상태 반영
* Sync 결과 상태 반영

---

# 15. types 폴더

## 역할

PWA 관련 타입을 관리한다.

## 파일

```text
pwa.types.ts
sync.types.ts
cache.types.ts
indexedDb.types.ts
```

---

## pwa.types.ts

```ts
export type InstallStatus =
  | 'installable'
  | 'installed'
  | 'dismissed'
  | 'unsupported'

export type NetworkStatus =
  | 'online'
  | 'offline'

export type CacheStatus =
  | 'cache_loading'
  | 'cache_ready'
  | 'cache_error'

export type SyncStatus =
  | 'pending_sync'
  | 'syncing'
  | 'synced'
  | 'sync_failed'

export type UpdateStatus =
  | 'update_available'
  | 'updating'
  | 'update_completed'
  | 'update_failed'
```

---

# 16. 의존성 방향

PWA 내부 의존성은 다음 방향을 따른다.

```text
UI
 ↓
state
 ↓
service
 ↓
repository
 ↓
IndexedDB / Cache Storage
```

---

금지

```text
UI → IndexedDB 직접 접근
UI → Cache Storage 직접 접근
Service Worker → React Store 직접 접근
```

---

# 17. 기능별 연결 구조

## 오프라인 거래 저장

```text
UI
 ↓
offlineTransaction.service
 ↓
offlineTransaction.repository
 ↓
IndexedDB
 ↓
syncQueue.repository
```

---

## 동기화 실행

```text
Network Restore
 ↓
syncRunner
 ↓
syncQueue.service
 ↓
API
 ↓
cacheInvalidation
```

---

## 설치 배너

```text
beforeinstallprompt
 ↓
installPrompt.service
 ↓
pwa.store
 ↓
UI
```

---

## 업데이트 배너

```text
Service Worker update
 ↓
updateDetector
 ↓
pwa.store
 ↓
UI
```

---

# 18. 파일 작성 규칙

## 네이밍

| 유형         | 규칙                |
| ---------- | ----------------- |
| Service    | `*.service.ts`    |
| Repository | `*.repository.ts` |
| Config     | `*.config.ts`     |
| Type       | `*.types.ts`      |
| Policy     | `*.policy.ts`     |
| Store      | `*.store.ts`      |

---

## Import 규칙

* 상위 레이어에서 하위 레이어만 참조한다.
* 순환 참조를 금지한다.
* 공통 타입은 `types`에서 가져온다.
* IndexedDB 직접 접근은 Repository 내부에서만 허용한다.

---

# 19. 관련 문서 연결

| 문서              | 연결 내용             |
| --------------- | ----------------- |
| PWA개요           | PWA 전체 구성         |
| Manifest정의      | manifest 폴더       |
| ServiceWorker정의 | service-worker 폴더 |
| Workbox전략정의     | workbox 폴더        |
| 캐시정책            | cache 폴더          |
| IndexedDB정의     | indexed-db 폴더     |
| 오프라인동작정의        | offline 폴더        |
| 동기화구조           | sync 폴더           |
| 업데이트정책          | update 폴더         |
| PWA상태정의         | state 폴더          |

---

# 20. 최종 목표

PWA 폴더 구조는 미냥이 지갑의 PWA 기능을 기능별로 분리하여 유지보수 가능한 구조로 관리하기 위한 기준이다.

최종적으로 다음을 만족해야 한다.

* Service Worker 관리 분리
* Workbox 전략 분리
* IndexedDB 접근 캡슐화
* 오프라인 저장 구조 분리
* 동기화 구조 분리
* 설치 상태 관리 분리
* 업데이트 처리 분리
* Zustand 기반 PWA 상태 관리
* 향후 Capacitor 확장 가능 구조 유지
