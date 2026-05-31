# KITTYWALLET

미냥이 지갑(KITTYWALLET)은 계좌, 카드, 거래 내역을 통합 관리할 수 있는 PWA 기반 모바일 가계부 서비스입니다.

본 프로젝트는 단순 UI 구현이 아닌, 유지보수성과 확장성을 고려한 구조 중심 개발을 목표로 합니다.

---

# 저장소

| 항목 | 내용 |
| --- | --- |
| 원격 저장소 | https://github.com/kittysaemi/KittyWallet |
| 로컬 저장소 | `C:\Users\saemi\source\KittyWallet` |

본 저장소의 구현 기준은 `AGENTS.md`와 `docs/00_project/문서인덱스.md`를 최우선으로 따릅니다.

---

# 프로젝트 목표

* 모바일 중심 가계부 서비스 제공
* 빠른 거래 입력 환경 제공
* 계좌/카드/거래 내역 통합 관리
* 소비 흐름 및 통계 정보 제공
* 오프라인 일부 기능 지원
* API 변경에 유연한 구조 설계
* 유지보수 가능한 아키텍처 구성
* AI(Codex/GPT) 협업 가능한 개발 환경 구성

---

# 플랫폼

| 항목      | 내용                      |
| ------- | ----------------------- |
| 플랫폼     | PWA 기반 모바일 웹앱           |
| 지원 환경   | Android / iOS 모바일 브라우저  |
| 앱 전환    | Capacitor 기반 하이브리드 앱 예정 |
| 반응형     | 모바일 우선 설계               |
| 오프라인 지원 | 일부 기능 지원 예정             |

---

# 주요 기능

## 거래 관리

* 수입/지출 거래 등록
* 거래 수정 및 삭제
* 거래 검색
* 기간별 조회

## 계좌 관리

* 계좌 등록 및 관리
* 잔액 관리

## 카드 관리

* 카드 등록 및 관리
* 카드별 사용 내역 확인

## 카테고리 관리

* 카테고리 등록 및 수정
* 아이콘 선택 기능

## 통계 기능

* 소비 통계 확인
* 기간별 소비 흐름 분석

## 사용자 기능

* 로그인 및 인증
* 사용자 설정 관리

## PWA 기능

* 앱 설치 지원
* 캐시 기반 빠른 로딩
* 오프라인 일부 기능 지원

---

# 기술 스택

## Frontend

| 항목 | 기술 |
| --- | --- |
| Framework | React |
| Language | TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Routing | React Router |
| Client State | Zustand |
| Server State | React Query |
| API Client | Axios |
| Validation | Zod |
| Icons | Lucide Icons |
| Charts | Chart.js |
| App Packaging | Capacitor (Planned) |

## Backend

| 항목             | 기술            |
| -------------- | ------------- |
| Runtime        | Node.js 20    |
| Framework      | NestJS        |
| ORM            | Prisma        |
| Database       | PostgreSQL 16 |
| Authentication | JWT           |
| Encryption     | bcryptjs      |

## PWA

| 항목 | 기술 |
| --- | --- |
| PWA 구성 | Vite PWA Plugin |
| 캐시/오프라인 | Service Worker |
| 로컬 저장 | IndexedDB |
| 동기화 | Sync Queue |

## Infrastructure

| 항목            | 기술         |
| ------------- | ---------- |
| Container     | Docker     |
| Reverse Proxy | Nginx      |
| Environment   | .env 기반 설정 |

---

# 프로젝트 구조

```text
/docs
/apps
/packages
/scripts
/.github
```

## Docs

```text
/docs
 ├── 00_project
 ├── 01_service-planning
 ├── 02_information-architecture
 ├── 03_screen-spec
 ├── 04_business-policy
 ├── 05_data-design
 ├── 06_api-spec
 ├── 07_frontend-architecture
 ├── 08_backend-architecture
 ├── 09_pwa
 ├── 10_design-system
 ├── 11_testing
 └── 12_deployment
```

## Applications

```text
/apps
 ├── frontend
 └── backend
```

## Shared Packages

```text
/packages
 ├── shared-types
 ├── shared-utils
 └── shared-api
```

---

# 개발 원칙

본 프로젝트는 다음 원칙을 기준으로 개발합니다.

## 문서 우선 개발

모든 구현은 문서 기준을 먼저 확인한 뒤 진행합니다.

작업 시작 시 참조 순서:

1. `AGENTS.md`
2. `docs/00_project/문서인덱스.md`
3. 작업 유형별 필수 문서
4. 관련 정책/API/ERD/화면/상태 문서

## 정책 기반 개발

정책 정의 없이 기능을 구현하지 않습니다.

## 상태 기반 UI 개발

모든 화면은 상태를 정의합니다.

필수 상태:

* loading
* empty
* error
* offline

## 예외 처리 우선

Happy Path만 구현하지 않습니다.

반드시 고려:

* API 실패
* 네트워크 오류
* 토큰 만료
* 저장 실패
* 오프라인 저장 실패

## 구조 중심 개발

단순 기능 구현보다 유지보수 가능한 구조를 우선합니다.

목표:

* API 변경 영향 최소화
* 기능 추가 영향 최소화
* 공통 로직 재사용 가능 구조 유지

---

# AI 협업 개발 규칙

본 프로젝트는 Codex/GPT 기반 협업을 고려하여 개발합니다.

## 작업 기준

모든 작업은 `docs/00_project/문서인덱스.md`의 빠른 참조 경로를 기준으로 필요한 문서를 확인한 뒤 진행합니다.

필수 기준 문서:

* 정책 정의
* 상태 정의
* 예외 처리 정의
* API 명세
* 데이터 구조 정의
* ERD

작업 유형별 대표 참조:

| 작업 유형 | 먼저 볼 문서 | 함께 볼 문서 |
| --- | --- | --- |
| 신규 기능 구현 | `docs/01_service-planning/MVP범위.md` | `docs/04_business-policy/정책정의.md`, `docs/03_screen-spec/화면정의.md` |
| 화면 구현 | `docs/03_screen-spec/화면정의.md` | `docs/03_screen-spec/상태정의.md`, `docs/10_design-system/컴포넌트정의.md` |
| API 구현 | `docs/06_api-spec/공통응답규격.md` | 해당 API 문서, `docs/08_backend-architecture/유스케이스정의.md` |
| DB/Prisma 작업 | `docs/05_data-design/ERD.md` | `docs/05_data-design/데이터구조정의.md`, `docs/08_backend-architecture/Repository정책.md` |
| PWA/오프라인 작업 | `docs/04_business-policy/오프라인정책.md` | `docs/09_pwa/동기화구조.md`, `docs/09_pwa/IndexedDB정의.md` |
| 테스트 작성 | `docs/11_testing/테스트케이스정의.md` | `docs/11_testing/E2E시나리오.md`, `docs/11_testing/오류테스트정의.md` |
| 배포/운영 | `docs/12_deployment/배포정책.md` | `docs/12_deployment/배포절차.md`, `docs/12_deployment/운영체크리스트.md` |

## 금지 사항

* 정책 없는 기능 구현 금지
* 상태 정의 없는 UI 구현 금지
* API 명세 없는 API 구현 금지
* 임의 DB 컬럼 추가 금지
* 화면 정의 없는 UI 추가 금지

---

# GitHub 작업 흐름

```text
Issue 생성
→ 문서 정의
→ 개발
→ Pull Request
→ 리뷰
→ Merge
→ Done 처리
```

모든 작업은 GitHub Issue 및 GitHub Projects 기준으로 관리합니다.

---

# 현재 개발 상태

현재 프로젝트 문서 기준으로는 HTML/CSS/JavaScript 기반 localStorage 프로토타입에서 출발하여, React/TypeScript/Vite 프론트엔드와 NestJS/Prisma/PostgreSQL 백엔드 기반 API 구조로 확장하는 것을 목표로 합니다.

## 완료

* 서비스 기획
* 사이트맵
* 사용자 플로우
* 화면 정의
* 정책 정의
* 데이터 구조 및 ERD
* 아키텍처 설계

## 진행 예정

* API 서버 개발
* 인증 시스템 구축
* 상태 관리 적용
* PWA 기능 구현
* 앱 패키징
* 테스트 및 배포 환경 구성

---

# 최종 목표

* 다수 사용자를 지원하는 API 기반 서비스
* 유지보수 가능한 구조 기반 서비스
* 오프라인 대응 가능한 PWA 서비스
* iOS / Android 하이브리드 앱 지원
* 장기 운영 가능한 모바일 가계부 플랫폼 구축
