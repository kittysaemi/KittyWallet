# PWA배포정의.md

# 1. 문서 목적

본 문서는 미냥이 지갑 PWA(Progressive Web App)의 배포 정책 및 운영 절차를 정의한다.

일반 웹 서비스와 달리 PWA는 다음 요소를 함께 관리해야 한다.

* Frontend Build
* Service Worker
* Cache Storage
* Manifest
* IndexedDB
* Offline 데이터
* App Install 상태

따라서 본 문서는 단순 웹 배포가 아닌 PWA 운영 기준 문서로 사용한다.

---

# 2. 적용 범위

| 구분             | 대상                   |
| -------------- | -------------------- |
| Frontend       | React/Vite           |
| PWA            | vite-plugin-pwa      |
| Service Worker | Workbox              |
| Cache          | Cache Storage        |
| Storage        | IndexedDB            |
| Manifest       | manifest.json        |
| Browser        | Chrome, Edge, Safari |

---

# 3. 관련 문서

* 배포정책.md
* 배포절차.md
* 버전관리정책.md
* 운영체크리스트.md
* 동기화운영정의.md
* Workbox전략정의.md
* IndexedDB정의.md

---

# 4. PWA 배포 특징

일반 웹 배포

```text
빌드
↓
배포
↓
즉시 반영
```

---

PWA 배포

```text
빌드
↓
배포
↓
Service Worker 설치
↓
Cache 생성
↓
사용자 브라우저 반영
```

즉시 반영되지 않을 수 있음

---

# 5. 배포 대상

## Frontend Build

예시

```text
dist/
```

---

## Manifest

예시

```text
/kittywallet/manifest.webmanifest
```

검증

```json
{
  "name": "미냥이 지갑",
  "short_name": "미냥이 지갑"
}
```

---

## Service Worker

예시

```text
/kittywallet/sw.js
/kittywallet/workbox-*.js
```

---

## 아이콘

필수

```text
192x192
512x512
maskable
```

---

# 6. 배포 전 검증

## PWA Build

수행

```bash
npm run build
```

기대 결과

```text
Build Success
```

---

## Manifest 검증

확인

```text
manifest.webmanifest
```

검증 항목

| 항목        | 확인   |
| --------- | ---- |
| name      | PASS |
| icons     | PASS |
| start_url `/kittywallet/` | PASS |
| scope `/kittywallet/` | PASS |
| display   | PASS |

---

## Service Worker 검증

확인

```text
vite-plugin-pwa
```

생성 확인

```text
/kittywallet/sw.js
```

---

# 7. PWA 버전 정책

## App Version

예시

```text
1.0.0
```

---

## Service Worker Version

예시

```text
sw-v1
sw-v2
sw-v3
```

---

## Cache Version

예시

```text
kittywallet-cache-v1
kittywallet-cache-v2
```

---

# 8. Cache 버전 증가 기준

반드시 증가

| 변경사항            | 증가  |
| --------------- | --- |
| API 캐시 변경       | YES |
| Static Asset 변경 | YES |
| Workbox 변경      | YES |
| Offline 정책 변경   | YES |

---

증가 불필요

| 변경사항     | 증가 |
| -------- | -- |
| 단순 문구 수정 | NO |
| CSS 수정   | NO |

---

# 9. 배포 절차

## STEP 1

버전 확인

```text
1.2.0
```

---

## STEP 2

Build

```bash
npm run build
```

---

## STEP 3

Docker Build

```bash
docker build -t kittywallet-web:1.2.0 .
```

---

## STEP 4

Docker Push

```bash
docker push registry/kittywallet-web:1.2.0
```

---

## STEP 5

운영 배포

```bash
docker compose pull

docker compose up -d
```

---

## STEP 6

Service Worker 등록 확인

Chrome

```text
DevTools
 └ Application
     └ Service Workers
```

기대 결과

```text
Activated
Running
```

---

## STEP 7

Manifest 확인

Chrome

```text
Application
 └ Manifest
```

검증

* 아이콘
* 이름
* 시작 URL

---

# 10. 배포 후 검증

## 설치 검증

절차

1. 사이트 접속
2. 설치 버튼 클릭

기대 결과

```text
홈 화면 설치 가능
```

---

## 실행 검증

절차

1. 홈 화면 실행

기대 결과

```text
앱 모드 실행
```

브라우저 주소창 미표시

---

## Cache 검증

Chrome

```text
Application
 └ Cache Storage
```

기대 결과

```text
kittywallet-cache-v2
```

존재

---

# 11. 업데이트 검증

## 기존 사용자

상황

```text
v1.0.0 사용 중
```

---

배포

```text
v1.1.0
```

---

기대 결과

```text
새 버전 감지
```

---

## 검증

Chrome

```text
Application
 └ Service Worker
```

확인

```text
Waiting
Activated
```

---

# 12. 강제 업데이트 정책

적용 상황

* 보안 이슈
* API 구조 변경
* IndexedDB 구조 변경 중 데이터 마이그레이션 경로가 검증된 경우

---

수행

```javascript
self.skipWaiting();
clients.claim();
```

---

주의

* 강제 업데이트 전 Sync Queue pending count를 확인한다.
* pending Sync Queue가 1건 이상이면 업데이트를 지연하고 사용자에게 동기화를 안내한다.
* IndexedDB 삭제를 강제 업데이트 수단으로 사용하지 않는다.

---

# 13. Cache 초기화 정책

허용 상황

* Cache 손상
* Service Worker 오류

---

범위

```text
Cache Storage만 삭제 가능
IndexedDB 삭제 금지
Sync Queue 삭제 금지
```

---

수행

```javascript
caches.keys().then(keys => {
  keys.forEach(key => caches.delete(key));
});
```

---

금지

정기적 Cache 삭제

---

# 14. IndexedDB 보호 및 삭제 정책

## 원칙

IndexedDB는 사용자 오프라인 거래와 Sync Queue를 포함할 수 있으므로 운영 조치에서 직접 삭제하지 않는다.

---

## 삭제 허용 기준

IndexedDB 삭제는 다음 조건을 모두 만족할 때만 최후 수단으로 허용한다.

| 조건 | 기준 |
|---|---|
| 사용자 확인 | 사용자가 데이터 삭제 위험을 인지하고 명시적으로 동의 |
| Sync Queue export | 삭제 전 Queue 데이터를 파일 또는 안전한 로그로 export |
| pending count 확인 | pending Sync Queue가 0건임을 확인 |
| 서버 반영 여부 확인 | 대상 거래가 서버에 반영되었는지 확인 |
| 운영 승인 | 개발/운영 승인 완료 |

---

## 삭제 전 점검 절차

```text
1. 사용자에게 IndexedDB 삭제 영향 안내
2. Sync Queue export 수행
3. pending Sync Queue count 확인
4. 서버 TRANSACTION 반영 여부 확인
5. 운영 승인 기록
6. 최후 수단으로 IndexedDB 삭제
```

---

## 금지

```text
장애 대응 편의를 위한 IndexedDB 삭제
Cache 초기화와 함께 IndexedDB 동시 삭제
사용자 확인 없는 IndexedDB 삭제
pending Sync Queue 존재 시 IndexedDB 삭제
```

---

# 15. IndexedDB 영향 검토

배포 전 확인

| 항목         | 확인 |
| ---------- | -- |
| Store 변경   | □  |
| Index 변경   | □  |
| Version 증가 | □  |

---

영향 발생 시

```text
동기화운영정의.md
```

검토 필수

---

# 16. 롤백 정책

롤백 기준

* 설치 불가
* Service Worker 오류
* Cache 오류
* Offline 진입 불가

---

수행

```text
롤백정의.md
```

절차 적용

---

# 17. 장애 대응

## PWA 설치 불가

확인

```text
Manifest
```

검증

* icon
* start_url
* display

---

## Service Worker 오류

확인

```text
Console
Service Worker
```

---

## Cache 오류

확인

```text
Cache Storage
```

조치

```text
Cache Storage 초기화
Service Worker 재등록
IndexedDB 삭제 금지
```

---

# 18. 운영 모니터링

확인 항목

| 항목                | 기준     |
| ----------------- | ------ |
| 설치 성공률            | 95% 이상 |
| Service Worker 등록 | 99% 이상 |
| Cache 생성          | 정상     |
| Offline 진입        | 정상     |

---

# 19. 운영 승인

배포 완료 후

필수 확인

| 항목 | 승인 |
| -- | -- |
| 개발 | □  |
| QA | □  |
| 운영 | □  |

---

# 20. AI 자동화 기준

AI 수행 가능

* Build 검증
* Manifest 검증
* Cache 버전 확인
* Service Worker 상태 확인
* 설치 가능 여부 확인

AI 수행 금지

* 운영 Cache 강제 삭제
* 사용자 확인 및 운영 승인 없는 IndexedDB 삭제
* 승인 없는 강제 업데이트

---

# 21. 배포 완료 기준

다음 조건 모두 충족

* Build 성공
* Manifest 정상
* Service Worker 정상
* Cache 정상
* 설치 가능
* Offline 진입 가능
* Sync 정상
* 운영 승인 완료

모든 조건 충족 시 PWA 배포 완료로 간주한다.
