# Git 작업 규칙

## 목적

본 문서는 미냥이 지갑 프로젝트의 Git 사용 규칙을 정의한다.

모든 변경 사항은 추적 가능해야 하며, AI(Codex, Claude Code)와 사람이 동일한 기준으로 작업할 수 있어야 한다.

---

# 브랜치 전략

## Issue 작업 시작 규칙

GitHub Issue 기반 작업은 개발 시작 전에 반드시 새 브랜치를 생성한다.

작업자는 이슈 확인, 브랜치 생성, 문서 확인, 구현, 테스트/검증, 커밋, push, PR 생성, 이슈 체크박스 갱신 등 각 단계 시작 전에 관련 문서의 최신 변경 사항과 준수 기준을 확인한다.

작업자는 브랜치 생성 전에 GitHub에서 다음 항목을 확인한다.

* 대상 Issue 상태
* 선행/의존 Issue 상태
* 서브이슈 목록과 상태
* Issue 본문과 댓글의 추가 조건
* 작업 범위 체크박스
* 완료 조건 체크박스
* 서브이슈 체크박스

선행/의존 Issue가 완료되지 않은 경우 현재 Issue 구현을 시작하지 않는다.

서브이슈가 있는 경우 서브이슈를 먼저 수행해야 하는지 확인한다. 가능한 경우 서브이슈를 모두 처리한 뒤 상위 Issue를 완료한다.

Issue 상태 확인은 항상 GitHub Issue 기준으로 수행하며, 로컬 브랜치나 문서만으로 완료 여부를 판단하지 않는다.

---

## Project Status 갱신 규칙

GitHub Project 보드를 사용하는 Issue는 작업 진행 상태를 Project Status로 함께 관리한다.

* Issue 작업을 실제로 시작할 때 GitHub Project 등록 여부를 확인한다.
* Issue가 Project에 등록되어 있지 않으면 먼저 Project에 추가한 뒤 Project Status를 `In Progress`로 변경한다.
* PR 생성 후에도 아직 merge 전이면 Project Status는 `In Progress`로 유지한다.
* PR merge 또는 Issue close 완료 시 Project Status를 `Done`으로 변경한다.
* 선행 Issue가 완료되지 않아 작업을 중단하는 경우 Project Status를 임의 변경하지 않는다.
* 도구 권한 또는 GitHub API 제한으로 Project 등록이나 Status 변경이 불가능한 경우, 작업자는 가능한 범위까지 진행한 뒤 변경하지 못한 이유와 필요한 수동 조치를 사용자에게 보고한다.

Project Status는 Issue의 `open`/`closed` 상태와 별개이므로, Issue 본문이나 PR만 수정하고 Project Status 갱신을 생략하지 않는다.

---

## Issue 체크박스 갱신 규칙

Issue 본문에 작업 범위, 완료 조건, 서브이슈 체크박스가 있는 경우 해당 작업을 수행한 작업자가 갱신한다.

체크 기준:

* 작업 범위, 완료 조건, 서브이슈 체크박스는 거짓 없이 실제 완료된 경우에만 체크한다.
* 구현 또는 문서 반영이 실제로 완료된 항목만 체크한다.
* 검증이 필요한 항목은 검증 명령 또는 실제 동작 확인이 성공한 뒤 체크한다.
* PR 생성 또는 이슈 연결 항목은 PR 생성과 연결 확인이 끝난 뒤 체크한다.
* 서브이슈 체크박스는 해당 서브이슈 작업이 완료되고 PR 또는 커밋에 연결된 경우에만 체크한다.
* 완료하지 않은 항목, 별도 후속 작업으로 분리한 항목, 검증하지 못한 항목은 체크하지 않는다.

Issue 본문 체크박스 갱신은 로컬 문서 수정이 아니라 GitHub Issue 본문 업데이트로 수행한다.

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

## 메인이슈와 서브이슈 커밋 분리

메인이슈와 서브이슈 작업은 가능한 한 커밋을 분리한다.

서브이슈는 각각 개별 작업 브랜치를 가져야 한다.

서브이슈가 개별적으로 개발 완료되면 해당 서브이슈 단위로 커밋한다.

예시

```text
docs(issue-73): 서브이슈 커밋 분리 규칙 추가
docs(issue-74): 서브이슈 PR 분리 예외 기준 추가
```

여러 서브이슈가 기술적으로 강하게 결합되어 하나의 커밋으로 처리해야 하는 경우, 작업자는 커밋 전에 사용자에게 분리할 수 없는 이유를 설명한다.

불가 사유에는 다음 내용을 포함한다.

* 서브이슈 간 변경 파일과 코드 흐름이 겹치는 이유
* 개별 커밋으로 분리할 경우 빌드, 테스트, 마이그레이션, 배포 흐름이 깨지는 이유
* 하나의 커밋으로 묶을 경우 포함되는 메인이슈와 서브이슈 목록

연관 있는 이슈들이 같은 변경 범위와 검증 흐름을 공유하는 경우에만 여러 이슈를 하나의 커밋으로 묶을 수 있다.

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

서브이슈를 개별적으로 완료한 경우 해당 서브이슈 단위로 PR을 생성한다.

서브이슈 PR을 생성한 뒤에는 해당 서브이슈의 Project Status를 `In Progress`로 변경한다.

예시

```text
Closes #15
```

메인이슈와 서브이슈를 하나의 PR로 함께 처리해야 하는 경우, PR 생성 전에 사용자에게 개별 PR로 분리할 수 없는 이유를 설명한다.

연관 있는 이슈들이 같은 변경 범위와 검증 흐름을 공유하는 경우에만 여러 이슈를 하나의 PR로 묶어 처리할 수 있다.

하나의 PR에 여러 이슈를 포함하는 경우 PR 본문에는 메인이슈와 포함된 모든 서브이슈 번호를 항상 명시하여 GitHub Issue 상태가 연동되도록 한다.

서브이슈들끼리만 하나의 PR로 묶는 경우에도 PR 본문에는 묶여 있는 모든 서브이슈 번호를 항상 기재하여 GitHub Issue 상태가 연동되도록 한다.

예시

```text
Refs #5
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

## 브랜치 보호 및 필수 체크

기본 브랜치(`main`)와 현재 PR 기준 브랜치에는 GitHub 브랜치 보호 규칙 또는 ruleset을 설정한다.

브랜치 보호 규칙에는 다음 항목을 포함한다.

* PR 없이 직접 push 금지
* CI가 성공해야 merge 가능
* PR의 필수 상태 체크로 `Shared packages`, `Backend`, `Frontend` 등 실제 CI job을 지정
* 지정된 필수 체크가 실패하거나 완료되지 않은 경우 merge 금지
* 리뷰 승인이 필요한 저장소에서는 최소 1명 이상의 리뷰 승인 후 merge 가능
* 기준 브랜치보다 오래된 PR은 최신 기준 브랜치 반영 후 merge 가능

CI workflow 작성만으로는 merge 차단이 보장되지 않는다. `lint`, `type-check`, `test`, `build`, Docker build 등 필수 검증이 실패했을 때 PR merge가 차단되려면 GitHub 브랜치 보호 규칙에서 해당 CI check를 필수 상태 체크로 등록해야 한다.

Issue 완료 조건에 "검사 실패 시 merge 금지" 또는 "lint/build 실패 시 PR merge 차단"이 포함된 경우 작업자는 다음을 확인한다.

* 대상 기준 브랜치에 브랜치 보호 규칙 또는 ruleset이 설정되어 있는지 확인한다.
* 필수 상태 체크에 해당 PR에서 실행되는 CI job 이름이 등록되어 있는지 확인한다.
* 브랜치 보호가 없거나 필수 체크가 등록되어 있지 않으면 해당 완료 조건은 체크하지 않는다.
* 설정 권한이 없어 직접 적용할 수 없으면 필요한 수동 조치와 미완료 조건을 사용자에게 보고한다.

---

# 릴리즈 태그

SemVer 사용

예시

v1.0.0

v1.1.0

v1.1.1

---

# 버전 관리 및 릴리즈 자동화

## 버전 기준

프로그램 버전은 SemVer를 사용한다.

* `MAJOR`: 기존 API, 데이터, 배포 환경과 호환되지 않는 변경
* `MINOR`: 하위 호환 가능한 기능 추가
* `PATCH`: 버그 수정, UI 표시 수정, 문서/설정 보완

## 커밋 타입과 버전 증가

`main` 브랜치에 merge된 Conventional Commit을 기준으로 semantic-release가 버전을 계산한다.

* `feat:` → MINOR
* `fix:` → PATCH
* `feat!:` 또는 본문 `BREAKING CHANGE:` → MAJOR

릴리즈 버전은 사람이 직접 tag를 생성하거나 `package.json` version만 수동 수정하지 않는다.

## 자동 릴리즈 흐름

`main` 브랜치에 push되면 Release workflow가 다음 순서로 실행된다.

```text
npm ci
↓
lint
↓
type-check
↓
test
↓
build
↓
semantic-release
↓
CHANGELOG.md 갱신
↓
package.json / package-lock.json version 갱신
↓
Git tag 생성
↓
GitHub Release 생성
```

릴리즈 커밋은 semantic-release가 생성하며 메시지는 `chore(release): {version} [skip ci]` 형식을 사용한다.

## 앱 버전 표시

앱 설정 화면의 버전 표시는 루트 `package.json` version을 기준으로 한다.

따라서 운영 배포물의 앱 버전은 Git tag, GitHub Release, `package.json` version과 일치해야 한다.

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
* 작업 시작 시 Project 등록 여부를 확인하고 Project Status를 `In Progress`로 변경하며, PR merge 또는 Issue close 후 `Done`으로 변경한다.
* 검증 성공 전에는 커밋, push, PR 생성을 하지 않는다.
* 검증과 PR 생성 후 완료된 Issue 체크박스를 갱신한다.
* 개발에만 필요한 로컬 도구, 빌드 산출물, 캐시, 환경 파일은 커밋하지 않는다.
