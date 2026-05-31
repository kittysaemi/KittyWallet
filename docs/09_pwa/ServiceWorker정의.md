# ServiceWorker정의

## 1. 문서 목적

본 문서는 미냥이 지갑 PWA의 Service Worker 구성, 역할, 이벤트 처리 및 운영 정책을 정의한다.

Service Worker는 PWA의 핵심 실행 엔진 역할을 수행하며 다음 기능을 담당한다.

* 정적 리소스 캐싱
* 오프라인 지원
* 네트워크 상태 대응
* API 캐싱
* 업데이트 감지
* 동기화 지원

본 문서는 다음 문서와 연계된다.

* PWA개요
* 설치정책
* Manifest정의
* 캐시정책
* 오프라인동작정의
* 동기화구조
* 업데이트정책
* PWA상태정의

---

# 2. Service Worker 개요

Service Worker는 브라우저와 서버 사이에서 동작하는 백그라운드 실행 프로세스이다.

```text
사용자
 ↓
Application
 ↓
Service Worker
 ↓
Network
 ↓
API Server
```

Service Worker는 네트워크 요청을 가로채고 캐시 및 오프라인 동작을 제어한다.

---

# 3. Service Worker 역할

## 3.1 설치 지원

Manifest와 함께 설치 가능 상태를 구성한다.

설치정책의 installable 상태는 다음 조건을 포함한다.

```text
Manifest 존재
AND
Service Worker 등록 완료
```

Service Worker 등록 실패 시

```text
unsupported 상태
```

로 처리한다.

---

## 3.2 정적 리소스 캐싱

대상

* HTML
* CSS
* JavaScript
* Font
* Icon
* App Shell

목표

```text
빠른 초기 로딩
오프라인 접근
재방문 성능 향상
```

---

## 3.3 API 캐싱

대상

* Dashboard
* Statistics
* Account List
* Card List
* Category List

목표

```text
오프라인 조회
네트워크 부하 감소
```

---

## 3.4 업데이트 감지

새 버전 배포 시

```text
새 Service Worker 설치
 ↓
새 버전 감지
 ↓
update_available
```

상태로 전환한다.

---

## 3.5 동기화 지원

오프라인 저장 거래 동기화를 지원한다.

```text
IndexedDB
 ↓
Sync Queue
 ↓
Network 복구
 ↓
동기화
```

---

# 4. Service Worker 등록 정책

## 등록 시점

Application 최초 실행 시 등록한다.

```text
앱 실행
 ↓
Service Worker 등록
 ↓
등록 성공
 ↓
활성화
```

---

## 등록 실패

처리

```text
PWA 기능 제한
설치 비활성화
로그 기록
```

서비스 자체는 계속 사용 가능해야 한다.

---

# 5. Service Worker 생명주기

## Install

최초 설치 단계

```text
Service Worker 다운로드
 ↓
Install
 ↓
정적 리소스 캐싱
```

---

### 처리 대상

```text
index.html
css
javascript
icon
manifest
```

---

## Activate

활성화 단계

```text
Install 완료
 ↓
Activate
 ↓
이전 캐시 정리
 ↓
최신 버전 활성화
```

---

### 처리 대상

* 구버전 캐시 제거
* 캐시 마이그레이션
* 버전 확인

---

## Fetch

네트워크 요청 처리

```text
요청 발생
 ↓
Fetch
 ↓
캐시 확인
 ↓
응답 반환
```

---

## Sync

동기화 처리

```text
Network 복구
 ↓
Sync 이벤트
 ↓
Queue 처리
```

---

# 6. 이벤트 정의

## install 이벤트

목적

```text
초기 캐시 생성
```

처리

```text
APP_SHELL 저장
```

---

## activate 이벤트

목적

```text
구버전 제거
```

처리

```text
CACHE_VERSION 비교
```

---

## fetch 이벤트

목적

```text
캐시 우선 처리
```

처리

```text
요청 유형 분석
 ↓
전략 선택
```

---

## sync 이벤트

목적

```text
오프라인 데이터 동기화
```

처리

```text
Queue 조회
 ↓
API 전송
 ↓
성공 처리
```

---

# 7. 캐시 영역 정의

## APP SHELL CACHE

저장 대상

```text
HTML
CSS
JS
ICON
FONT
```

---

목적

```text
앱 실행 보장
```

---

## API CACHE

저장 대상

```text
Dashboard
Statistics
Account
Card
Category
```

---

목적

```text
최근 데이터 제공
```

---

## IMAGE CACHE

저장 대상

```text
아이콘
사용자 이미지
```

---

목적

```text
빠른 렌더링
```

---

# 8. 캐시 전략

## App Shell

전략

```text
Cache First
```

---

이유

```text
앱 실행 속도 우선
```

---

## Dashboard

전략

```text
Network First
```

---

이유

```text
최신 데이터 우선
```

---

## Statistics

전략

```text
Stale While Revalidate
```

---

이유

```text
빠른 표시
백그라운드 갱신
```

---

## Account/Card/Category

전략

```text
Cache First
```

---

이유

```text
변경 빈도 낮음
```

---

# 9. 오프라인 처리 정책

## 조회

```text
Network 실패
 ↓
Cache 조회
 ↓
데이터 반환
```

---

지원 화면

* Dashboard
* Statistics
* 거래 검색
* 계좌 목록
* 카드 목록
* 카테고리 목록

---

## 저장

```text
거래 저장
 ↓
Offline
 ↓
IndexedDB 저장
 ↓
Queue 등록
```

---

지원 기능

```text
거래 등록
```

---

미지원 기능

```text
로그인
회원가입
비밀번호 재설정
```

---

# 10. 동기화 정책 연계

동기화 기준은 동기화정책 문서를 따른다.

Service Worker는 다음 역할만 수행한다.

```text
Queue 감지
 ↓
API 전송
 ↓
결과 전달
```

---

충돌 처리

```text
updated_at 기준
```

---

중복 방지

```text
client_temp_id 기준
```

---

# 11. 업데이트 정책 연계

## 새 버전 감지

```text
새 Service Worker 발견
 ↓
update_available
```

---

## 사용자 처리

```text
업데이트 안내
 ↓
새로고침
 ↓
최신 버전 적용
```

---

## 자동 적용 금지

실행 중 화면을 강제로 종료하지 않는다.

---

# 12. 상태 정의 연계

Service Worker는 다음 상태 생성에 관여한다.

| 상태               | 생성 조건         |
| ---------------- | ------------- |
| installable      | 등록 성공         |
| installed        | standalone 실행 |
| offline          | network 없음    |
| syncing          | sync 진행       |
| update_available | 새 SW 발견       |
| updating         | 적용 진행         |
| cache_ready      | 캐시 준비 완료      |

---

# 13. 예외 처리

## 캐시 생성 실패

처리

```text
서비스 계속 사용
로그 기록
```

---

## IndexedDB 오류

처리

```text
오프라인 저장 실패
사용자 안내
```

---

## Sync 실패

처리

```text
Queue 유지
재시도
```

---

## Update 실패

처리

```text
기존 버전 유지
```

---

## Service Worker 제거

처리

```text
PWA 기능 비활성
웹 서비스 유지
```

---

# 14. 구현 기준

기술 스택 기준

```text
React
Vite
vite-plugin-pwa
Workbox
```

---

구성 예시

```text
src
 ├─ sw
 │   ├─ service-worker.ts
 │   ├─ cache.ts
 │   ├─ sync.ts
 │   └─ update.ts
```

---

# 15. 성능 목표

| 항목     | 목표         |
| ------ | ---------- |
| 초기 로딩  | 3초 이내      |
| 재실행    | 1초 이내      |
| 캐시 조회  | 500ms 이내   |
| 동기화 시작 | 복구 후 5초 이내 |

---

# 16. 최종 목표

미냥이 지갑의 Service Worker는 단순 캐시 기능이 아니라 PWA 실행 엔진 역할을 수행한다.

최종적으로 다음을 만족해야 한다.

* 설치 지원
* 오프라인 접근 지원
* 거래 임시 저장 지원
* 자동 동기화 지원
* 업데이트 감지 지원
* 빠른 앱 실행 지원
* 데이터 손실 방지
* 하이브리드앱 확장 가능한 구조 유지
