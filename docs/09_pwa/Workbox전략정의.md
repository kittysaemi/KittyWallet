# Workbox전략정의

## 1. 문서 목적

본 문서는 미냥이 지갑 PWA에서 사용하는 Workbox 캐싱 전략과 Service Worker 구성 기준을 정의한다.

Workbox는 Service Worker 기반 캐시 처리, 런타임 캐싱, 리소스 갱신, 오프라인 대응을 표준화하기 위해 사용한다.

본 문서는 다음 문서와 연계된다.

* ServiceWorker정의
* 캐시정책
* 오프라인동작정의
* 동기화구조
* 업데이트정책
* PWA상태정의

---

# 2. Workbox 적용 목적

미냥이 지갑은 Vite PWA Plugin을 사용하여 Workbox 기반 Service Worker를 구성한다.

Workbox 적용 목적은 다음과 같다.

* 정적 리소스 캐싱 자동화
* API 요청별 캐시 전략 분리
* 오프라인 조회 지원
* 캐시 만료 및 정리 자동화
* Service Worker 업데이트 관리
* 캐시 정책과 실제 구현 기준 연결

---

# 3. Workbox 적용 범위

| 구분                  | 적용 여부 |
| ------------------- | ----- |
| App Shell 캐싱        | 적용    |
| API Runtime Caching | 적용    |
| 이미지 캐싱              | 적용    |
| 폰트 캐싱               | 적용    |
| 오프라인 거래 저장          | 미적용   |
| Sync Queue 저장       | 미적용   |
| IndexedDB 관리        | 미적용   |

Workbox는 **조회 및 리소스 캐싱**에 사용한다.

오프라인 거래 저장과 Sync Queue 관리는 IndexedDB정의 문서를 따른다.

---

# 4. 기본 구성 방식

미냥이 지갑은 `vite-plugin-pwa`의 Workbox 설정을 사용한다.

기준 파일

```text
vite.config.ts
```

기본 구조

```ts
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    cleanupOutdatedCaches: true,
    clientsClaim: true,
    skipWaiting: false,
    runtimeCaching: []
  }
})
```

---

# 5. Service Worker 등록 정책

## registerType

```ts
registerType: 'autoUpdate'
```

정책

* 새 Service Worker를 자동 감지한다.
* 새 버전 적용은 업데이트정책을 따른다.
* 사용자 데이터 보호를 위해 강제 새로고침은 기본 사용하지 않는다.

---

## skipWaiting

```ts
skipWaiting: false
```

정책

* 새 Service Worker가 즉시 기존 버전을 대체하지 않는다.
* Sync Queue가 존재할 수 있으므로 사용자 확인 후 업데이트한다.
* 업데이트 적용은 `update_available` 상태와 연결한다.

---

## clientsClaim

```ts
clientsClaim: true
```

정책

* 활성화된 Service Worker가 현재 클라이언트를 제어할 수 있도록 한다.
* 단, 새 버전 강제 적용은 하지 않는다.

---

## cleanupOutdatedCaches

```ts
cleanupOutdatedCaches: true
```

정책

* 구버전 Workbox 캐시를 자동 정리한다.
* App Shell 캐시와 API 캐시는 버전 기준으로 관리한다.
* Sync Queue 및 IndexedDB 데이터는 삭제하지 않는다.

---

# 6. 캐시 전략 매핑

| 대상                      | 전략                     | 문서 기준 |
| ----------------------- | ---------------------- | ----- |
| App Shell               | Cache First            | 캐시정책  |
| Dashboard API           | Network First          | 캐시정책  |
| Recent Transactions API | Network First          | 캐시정책  |
| Statistics API          | Stale While Revalidate | 캐시정책  |
| Account API             | Stale While Revalidate | 캐시정책  |
| Card API                | Stale While Revalidate | 캐시정책  |
| Category API            | Stale While Revalidate | 캐시정책  |
| Icon/Image              | Cache First            | 캐시정책  |
| Font                    | Cache First            | 캐시정책  |

---

# 7. App Shell 캐싱 전략

## 대상

```text
index.html
JavaScript
CSS
Manifest
App Icon
```

## 전략

```text
Cache First
```

## 목적

* 앱 실행 보장
* 빠른 초기 로딩
* 오프라인 접근 지원

## 정책

App Shell은 앱 실행에 필요한 최소 리소스이므로 캐시 우선 전략을 사용한다.

```text
Cache 조회
 ↓
있음
 ↓
즉시 반환

없음
 ↓
Network 요청
 ↓
Cache 저장
```

---

# 8. Dashboard API 전략

## 대상

```text
GET /api/v1/dashboard
GET /api/v1/transactions/recent
```

## 전략

```text
Network First
```

## TTL

```text
5분
```

## 목적

* 최신 자산 요약 표시
* 최근 거래 내역 최신성 유지
* 오프라인 시 마지막 캐시 제공

## 처리 흐름

```text
Network 요청
 ↓
성공
 ↓
Cache 갱신
 ↓
응답 반환

실패
 ↓
Cache 조회
 ↓
마지막 데이터 반환
```

---

# 9. Statistics API 전략

## 대상

```text
GET /api/v1/statistics/monthly
GET /api/v1/statistics/category
GET /api/v1/statistics/period
```

## 전략

```text
Stale While Revalidate
```

## TTL

```text
30분
```

## 목적

* 통계 화면 빠른 표시
* 백그라운드 최신화
* 오프라인 통계 조회 지원

## 처리 흐름

```text
Cache 즉시 반환
 ↓
Network 요청
 ↓
성공 시 Cache 갱신
```

---

# 10. Account API 전략

## 대상

```text
GET /api/v1/accounts
```

## 전략

```text
Stale While Revalidate
```

## TTL

```text
1시간
```

## 목적

* 계좌 목록 빠른 조회
* 오프라인 거래 등록 시 계좌 선택 지원
* 변경 빈도 낮은 데이터 최적화

---

# 11. Card API 전략

## 대상

```text
GET /api/v1/cards
```

## 전략

```text
Stale While Revalidate
```

## TTL

```text
1시간
```

## 목적

* 카드 목록 빠른 조회
* 오프라인 거래 등록 시 카드 선택 지원
* 변경 빈도 낮은 데이터 최적화

---

# 12. Category API 전략

## 대상

```text
GET /api/v1/categories
```

## 전략

```text
Stale While Revalidate
```

## TTL

```text
1시간
```

## 목적

* 카테고리 목록 빠른 조회
* 오프라인 거래 등록 시 카테고리 선택 지원
* 표시 여부가 ON인 카테고리만 선택 목록에 제공

---

# 13. Icon/Image 전략

## 대상

```text
/icons/*
/images/*
```

## 전략

```text
Cache First
```

## TTL

```text
7일
```

## 목적

* 아이콘 렌더링 속도 개선
* 오프라인 화면 표시 지원
* 불필요한 반복 요청 감소

---

# 14. Font 전략

## 대상

```text
/fonts/*
```

## 전략

```text
Cache First
```

## TTL

```text
30일
```

## 목적

* 폰트 로딩 지연 감소
* 앱 실행 안정성 확보

---

# 15. Workbox Runtime Caching 예시

```ts
runtimeCaching: [
  {
    urlPattern: ({ request }) => request.destination === 'document',
    handler: 'NetworkFirst',
    options: {
      cacheName: 'kittywallet-pages',
      expiration: {
        maxEntries: 20,
        maxAgeSeconds: 60 * 60 * 24
      }
    }
  },
  {
    urlPattern: ({ url }) => url.pathname.startsWith('/api/v1/dashboard'),
    handler: 'NetworkFirst',
    options: {
      cacheName: 'kittywallet-dashboard-api',
      expiration: {
        maxEntries: 10,
        maxAgeSeconds: 60 * 5
      }
    }
  },
  {
    urlPattern: ({ url }) => url.pathname.startsWith('/api/v1/transactions/recent'),
    handler: 'NetworkFirst',
    options: {
      cacheName: 'kittywallet-recent-transactions-api',
      expiration: {
        maxEntries: 10,
        maxAgeSeconds: 60 * 5
      }
    }
  },
  {
    urlPattern: ({ url }) => url.pathname.startsWith('/api/v1/statistics'),
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'kittywallet-statistics-api',
      expiration: {
        maxEntries: 20,
        maxAgeSeconds: 60 * 30
      }
    }
  },
  {
    urlPattern: ({ url }) => url.pathname.startsWith('/api/v1/accounts'),
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'kittywallet-accounts-api',
      expiration: {
        maxEntries: 20,
        maxAgeSeconds: 60 * 60
      }
    }
  },
  {
    urlPattern: ({ url }) => url.pathname.startsWith('/api/v1/cards'),
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'kittywallet-cards-api',
      expiration: {
        maxEntries: 20,
        maxAgeSeconds: 60 * 60
      }
    }
  },
  {
    urlPattern: ({ url }) => url.pathname.startsWith('/api/v1/categories'),
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'kittywallet-categories-api',
      expiration: {
        maxEntries: 20,
        maxAgeSeconds: 60 * 60
      }
    }
  },
  {
    urlPattern: ({ request }) => request.destination === 'image',
    handler: 'CacheFirst',
    options: {
      cacheName: 'kittywallet-images',
      expiration: {
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 7
      }
    }
  },
  {
    urlPattern: ({ request }) => request.destination === 'font',
    handler: 'CacheFirst',
    options: {
      cacheName: 'kittywallet-fonts',
      expiration: {
        maxEntries: 20,
        maxAgeSeconds: 60 * 60 * 24 * 30
      }
    }
  }
]
```

---

# 16. API Method 기준

## GET

캐싱 가능

대상

```text
조회 API
```

---

## POST

캐싱 금지

대상

```text
등록 API
로그인 API
회원가입 API
동기화 API
```

---

## PUT

캐싱 금지

대상

```text
수정 API
```

---

## DELETE

캐싱 금지

대상

```text
삭제 API
```

---

# 17. 캐시 금지 대상

다음 요청은 Workbox 캐싱 대상에서 제외한다.

```text
POST /api/v1/auth/login
POST /api/v1/auth/signup
POST /api/v1/auth/refresh
POST /api/v1/transactions
PUT /api/v1/transactions/{id}
DELETE /api/v1/transactions/{id}
POST /api/v1/sync/upload
```

---

# 18. 인증 API 처리 기준

인증 관련 API는 캐시하지 않는다.

이유

* 민감 정보 포함 가능
* 토큰 만료 상태와 충돌 가능
* 오프라인 인증 미지원

정책

```text
항상 Network Only
```

---

# 19. 거래 저장 API 처리 기준

거래 저장, 수정, 삭제 API는 캐시하지 않는다.

온라인 상태

```text
API 직접 호출
```

오프라인 상태

```text
IndexedDB 저장
Sync Queue 등록
```

---

# 20. 캐시 무효화 연계

다음 작업 성공 시 관련 캐시를 삭제하거나 갱신한다.

| 작업      | 무효화 대상                                     |
| ------- | ------------------------------------------ |
| 거래 등록   | Dashboard, Statistics, Recent Transactions |
| 거래 수정   | Dashboard, Statistics, Recent Transactions |
| 거래 삭제   | Dashboard, Statistics, Recent Transactions |
| 계좌 수정   | Account, Dashboard                         |
| 카드 수정   | Card, Dashboard                            |
| 카테고리 수정 | Category, Statistics                       |

---

# 21. 업데이트 정책 연계

새 버전 배포 시

```text
새 Service Worker 감지
 ↓
update_available 상태
 ↓
사용자 업데이트 승인
 ↓
구버전 캐시 정리
 ↓
신규 캐시 적용
```

정책

* 업데이트 전 Sync Queue 존재 여부를 확인한다.
* Sync Queue가 존재하면 업데이트를 즉시 적용하지 않는다.
* IndexedDB 데이터는 업데이트 과정에서 삭제하지 않는다.
* 운영 장애 대응에서도 Cache Storage 정리와 IndexedDB 삭제를 분리한다.
* IndexedDB 삭제는 사용자 확인, Sync Queue export, pending count 0건 확인, 서버 반영 확인 후 최후 수단으로만 허용한다.

---

# 22. 오프라인 동작 연계

Workbox는 오프라인 상태에서 다음 역할을 수행한다.

| 화면      | 처리                  |
| ------- | ------------------- |
| 대시보드    | Dashboard Cache 반환  |
| 거래 검색   | 최근 거래 Cache 반환      |
| 소비 통계   | Statistics Cache 반환 |
| 계좌 관리   | Account Cache 반환    |
| 카드 관리   | Card Cache 반환       |
| 카테고리 관리 | Category Cache 반환   |

거래 등록, 수정, 삭제는 Workbox가 아니라 IndexedDB와 Sync Queue가 처리한다.

---

# 23. 오류 처리

## Network 실패

처리

```text
캐시 조회
```

---

## 캐시 없음

처리

```text
empty 또는 offline 안내
```

---

## 캐시 만료

처리

```text
Network 재요청
실패 시 기존 캐시 사용 가능
```

---

## 캐시 손상

처리

```text
캐시 삭제 후 재생성
```

---

# 24. 보안 기준

Workbox 캐시에 저장하지 않는 데이터

```text
Access Token
Refresh Token
Password
개인 민감 정보
서버 오류 응답
```

인증 헤더가 포함된 API 응답은 필요한 최소 범위만 캐시한다.

사용자별 데이터가 섞이지 않도록 로그아웃 시 API 캐시를 정리한다.

---

# 25. 로그아웃 시 캐시 처리

로그아웃 시 다음 캐시를 삭제한다.

```text
kittywallet-dashboard-api
kittywallet-recent-transactions-api
kittywallet-statistics-api
kittywallet-accounts-api
kittywallet-cards-api
kittywallet-categories-api
```

유지 가능

```text
App Shell Cache
Image Cache
Font Cache
```

삭제 금지

```text
동기화 대기 Queue
```

단, 로그아웃 전 동기화 대기 데이터가 존재하면 사용자에게 안내한다.

---

# 26. 최종 목표

Workbox 전략은 미냥이 지갑 PWA의 캐시 정책을 실제 Service Worker 구현으로 연결하는 기준이다.

최종적으로 다음을 만족해야 한다.

* App Shell 캐싱
* API별 캐시 전략 분리
* 오프라인 조회 지원
* 거래 저장과 캐시 처리 분리
* Sync Queue 보호
* 업데이트 안정성 확보
* 사용자별 캐시 오염 방지
* 빠른 앱 실행 지원
