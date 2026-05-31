# PWA개요

## 1. 문서 목적

본 문서는 미냥이 지갑의 PWA(Progressive Web App) 적용 목적, 적용 범위, 구성 요소 및 운영 기준을 정의한다.

본 문서는 PWA 관련 모든 문서의 최상위 기준 문서로 사용하며 다음 문서와 연계된다.

* 설치정책
* Manifest정의
* ServiceWorker정의
* 캐시정책
* 오프라인동작정의
* 동기화구조
* 업데이트정책
* PWA상태정의
* 하이브리드확장정책

---

# 2. PWA 적용 목적

미냥이 지갑은 모바일 중심 가계부 서비스이며 사용자가 언제 어디서나 빠르게 거래를 기록할 수 있어야 한다.

이를 위해 별도의 앱스토어 배포 없이 모바일 앱 수준의 사용자 경험을 제공하는 것을 목표로 한다.

PWA 도입 목적은 다음과 같다.

### 모바일 앱 수준 UX 제공

* 홈 화면 설치 지원
* 전체 화면 실행 지원
* 앱 형태 사용 경험 제공
* 빠른 초기 로딩

### 오프라인 사용 지원

* 최근 데이터 조회
* 거래 임시 저장
* 네트워크 복구 후 자동 동기화

### 유지보수 효율성 확보

* 단일 코드베이스 운영
* Android / iOS 공통 지원
* 웹 기반 배포

### 하이브리드앱 확장 기반 확보

* Capacitor 기반 앱 전환
* Native 기능 확장
* 앱스토어 배포 가능 구조 유지

---

# 3. PWA 적용 범위

## 3.1 지원 범위

| 구분             | 지원 여부 |
| -------------- | ----- |
| 홈 화면 설치        | 지원    |
| 오프라인 접근        | 지원    |
| Service Worker | 지원    |
| Manifest       | 지원    |
| 캐시 저장          | 지원    |
| 백그라운드 동기화      | 지원    |
| 전체 화면 실행       | 지원    |
| 앱 아이콘 표시       | 지원    |

---

## 3.2 미지원 범위

초기 MVP에서는 다음 기능을 제공하지 않는다.

| 기능           | 지원 여부 |
| ------------ | ----- |
| Web Push     | 미지원   |
| Native 생체인증  | 미지원   |
| Native 파일 저장 | 미지원   |
| 카메라 OCR      | 미지원   |
| Deep Link    | 미지원   |

해당 기능은 향후 Capacitor 확장 시 검토한다.

---

# 4. PWA 구성 요소

미냥이 지갑 PWA는 다음 구성 요소로 이루어진다.

```text
사용자
 ↓
브라우저
 ↓
PWA
 ├─ Manifest
 ├─ Service Worker
 ├─ Cache Storage
 ├─ IndexedDB
 └─ Application
      ↓
      API Server
```

---

## 4.1 Web App Manifest

앱 설치 정보를 제공한다.

제공 정보

* 앱 이름
* 앱 아이콘
* 시작 URL
* 실행 모드
* 테마 색상

---

## 4.2 Service Worker

PWA 핵심 엔진 역할을 수행한다.

담당 기능

* 정적 리소스 캐싱
* API 응답 캐싱
* 오프라인 처리
* 버전 업데이트 감지
* 동기화 처리

---

## 4.3 Cache Storage

브라우저 캐시 저장소를 사용한다.

저장 대상

* HTML
* CSS
* JavaScript
* 아이콘
* 최근 API 데이터

---

## 4.4 IndexedDB

오프라인 데이터 저장소로 사용한다.

저장 대상

* 거래 임시 저장
* 동기화 대기 데이터
* Sync Queue
* 최근 조회 데이터

---

# 5. PWA 실행 구조

## 최초 실행

```text
브라우저 접속
 ↓
Application 로드
 ↓
Manifest 로드
 ↓
Service Worker 등록
 ↓
로그인 상태 확인
 ↓
대시보드 이동
```

---

## 설치 실행

```text
홈 화면 실행
 ↓
PWA 실행
 ↓
Service Worker 활성화
 ↓
캐시 확인
 ↓
데이터 조회
 ↓
화면 표시
```

---

# 6. 오프라인 구조

## 조회

```text
데이터 요청
 ↓
Network 확인
 ├─ Online
 │    ↓
 │  API 호출
 │
 └─ Offline
      ↓
   Cache 조회
```

---

## 저장

```text
거래 저장
 ↓
Network 확인
 ├─ Online
 │    ↓
 │  서버 저장
 │
 └─ Offline
      ↓
   IndexedDB 저장
      ↓
   Sync Queue 등록
```

---

# 7. 동기화 구조

오프라인 상태에서 저장된 거래는 Sync Queue에 등록한다.

네트워크 복구 시 자동 동기화를 수행한다.

```text
Offline 저장
 ↓
Sync Queue 등록
 ↓
Network 복구
 ↓
동기화 실행
 ↓
서버 저장
 ↓
Queue 제거
```

동기화 세부 기준은 동기화구조 문서를 따른다.

---

# 8. 상태 관리

PWA 전용 상태를 정의한다.

| 상태               | 설명       |
| ---------------- | -------- |
| installable      | 설치 가능    |
| installed        | 설치 완료    |
| offline          | 오프라인     |
| syncing          | 동기화 중    |
| update_available | 업데이트 가능  |
| updating         | 업데이트 진행  |
| cache_ready      | 캐시 준비 완료 |

세부 내용은 PWA상태정의 문서를 따른다.

---

# 9. 업데이트 구조

새 버전 배포 시 Service Worker 버전 변경을 통해 업데이트를 감지한다.

```text
새 버전 배포
 ↓
새 Service Worker 설치
 ↓
update_available
 ↓
사용자 안내
 ↓
새로고침
 ↓
최신 버전 적용
```

세부 정책은 업데이트정책 문서를 따른다.

---

# 10. 브라우저 지원 범위

지원 대상

* Chrome Android
* Edge Android
* Samsung Internet
* Safari iOS

모바일 환경을 우선 지원한다.

데스크톱 브라우저는 개발 및 테스트 용도로 사용한다.

---

# 11. Capacitor 확장 방향

현재 구조는 PWA를 기본으로 사용한다.

향후 다음 구조로 확장 가능해야 한다.

```text
PWA
 ↓
Capacitor
 ↓
Android
iOS
```

확장 시 추가 가능한 기능

* Push Notification
* Biometric Authentication
* Native Storage
* Camera API
* Deep Link

---

# 12. PWA 설계 원칙

미냥이 지갑의 PWA는 다음 원칙을 따른다.

* 모바일 우선 설계
* 오프라인 우선 고려
* 상태 기반 처리
* 자동 동기화 지원
* 사용자 데이터 손실 방지
* 최소 대기시간 제공
* 설치형 앱 경험 제공
* 하이브리드앱 확장 가능 구조 유지

---

# 13. 최종 목표

미냥이 지갑의 PWA는 단순 웹사이트가 아닌 모바일 앱 수준의 사용자 경험을 제공하는 것을 목표로 한다.

최종적으로 다음을 만족해야 한다.

* 홈 화면 설치 가능
* 오프라인 거래 저장 가능
* 자동 동기화 지원
* 빠른 초기 로딩
* 앱 수준 UX 제공
* Android/iOS 확장 가능 구조 유지
