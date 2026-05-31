# Git 작업 규칙

## 목적

본 문서는 미냥이 지갑 프로젝트의 Git 사용 규칙을 정의한다.

모든 변경 사항은 추적 가능해야 하며, AI(Codex, Claude Code)와 사람이 동일한 기준으로 작업할 수 있어야 한다.

---

# 브랜치 전략

## Issue 작업 시작 규칙

GitHub Issue 기반 작업은 개발 시작 전에 반드시 새 브랜치를 생성한다.

작업자는 브랜치 생성 전에 GitHub에서 다음 항목을 확인한다.

* 대상 Issue 상태
* 선행/의존 Issue 상태
* 서브이슈 목록과 상태
* Issue 본문과 댓글의 추가 조건

선행/의존 Issue가 완료되지 않은 경우 현재 Issue 구현을 시작하지 않는다.

서브이슈가 있는 경우 서브이슈를 먼저 수행해야 하는지 확인한다. 가능한 경우 서브이슈를 모두 처리한 뒤 상위 Issue를 완료한다.

Issue 상태 확인은 항상 GitHub Issue 기준으로 수행하며, 로컬 브랜치나 문서만으로 완료 여부를 판단하지 않는다.

---

## 기본 브랜치

main

배포 가능한 상태만 유지

---

## 개발 브랜치

develop

통합 개발 브랜치

---

## 작업 브랜치

형식

feature/{issue-number}-{name}

예시

feature/12-login

feature/31-transaction-create

---

버그 수정

fix/{issue-number}-{name}

예시

fix/55-token-refresh

---

문서 작업

docs/{issue-number}-{name}

예시

docs/101-api-update

---

## 도구/운영 환경 예외 브랜치

도구 또는 운영 환경이 별도 prefix를 요구하는 경우 해당 prefix를 허용한다.

허용 예외:

```text
codex/{name}
Claude/{name}
```

예시

```text
codex/api-doc-review
Claude/sync-policy-update
```

예외 브랜치도 PR, 리뷰, CI 검증, 문서 일치 원칙은 동일하게 적용한다.

---

# 커밋 규칙

Conventional Commit 사용

형식

type(scope): description

---

## feat

기능 추가

예시

feat(auth): 로그인 API 연동

---

## fix

버그 수정

예시

fix(transaction): 미래 날짜 검증 오류 수정

---

## docs

문서 수정

예시

docs(api): 거래 API 문서 보완

---

## refactor

구조 개선

예시

refactor(frontend): 거래 등록 폼 분리

---

## test

테스트 추가

예시

test(account): 계좌 등록 테스트 추가

---

## chore

설정 변경

예시

chore(git): PR 템플릿 추가

---

# 커밋 원칙

## 한 커밋 = 한 목적

좋음

feat(transaction): 거래 등록 API 추가

나쁨

feat: 거래 등록 추가 및 로그인 수정 및 UI 수정

---

## 커밋 가능한 상태 유지

빌드 실패 상태 커밋 금지

커밋 전 필수 검증:

```bash
npm run lint
npm run type-check
npm run test
npm run build
```

Docker 또는 인프라 변경이 포함된 경우 다음 검증도 수행한다.

```bash
docker compose build
docker compose up -d
```

헬스체크 API 또는 화면 실행 조건이 있는 경우 실제 응답까지 확인한다.

---

## 문서와 코드 동시 변경

정책 변경 시

문서 수정 → 코드 수정

순서 준수

---

# Pull Request 규칙

## 제목

Conventional Commit 형식 사용

예시

feat(transaction): 거래 등록 기능 구현

---

## 본문

필수 작성

### 작업 내용

* 거래 등록 기능 구현
* API 연동

### 변경 파일

* TransactionForm.tsx
* transactionApi.ts

### 확인 사항

* 거래 등록 성공
* Validation 정상 동작

### 관련 문서

* 화면정의.md
* 거래API.md

### 관련 이슈

Closes #12

서브이슈를 함께 처리한 경우 PR 본문에 상위 Issue와 처리한 서브이슈를 모두 기재한다.

예시

```text
Closes #5
Closes #15
Closes #16
```

---

# PR 크기 규칙

권장

300~500 라인 이하

최대

1000 라인 이하

초과 시 분리 권장

---

# 리뷰 체크리스트

* 문서와 일치하는가
* API 규격과 일치하는가
* 상태 관리 규칙을 준수하는가
* 중복 코드가 없는가
* 테스트 가능한가

---

# 병합 규칙

main 직접 Push 금지

반드시 PR 사용

---

# 릴리즈 태그

SemVer 사용

예시

v1.0.0

v1.1.0

v1.1.1

---

# AI 작업 규칙

AI는 작업 시작 전 `AGENTS.md`와 `docs/00_project/문서인덱스.md`를 확인한다.

상세 문서 탐색 순서는 `docs/00_project/문서인덱스.md`의 작업 유형별 빠른 참조 경로를 따른다.

문서에 정의되지 않은 기능은 구현하지 않는다.

필요 시 문서 수정 제안을 먼저 수행한다.

GitHub Issue 작업 시 AI는 다음을 추가로 준수한다.

* 개발 시작 전 새 브랜치를 생성한다.
* GitHub Issue에서 선행 Issue와 서브이슈 상태를 확인한다.
* 선행 Issue가 완료되지 않았으면 구현하지 않고 사용자에게 보고한다.
* 개발 범위의 서브이슈가 있으면 가능한 한 서브이슈를 먼저 처리한다.
* 검증 성공 전에는 커밋, push, PR 생성을 하지 않는다.
* 개발에만 필요한 로컬 도구, 빌드 산출물, 캐시, 환경 파일은 커밋하지 않는다.
