# CI-CD정의.md

# 1. 문서 목적

본 문서는 미냥이 지갑 서비스의 CI/CD(Continuous Integration / Continuous Deployment) 정책 및 운영 절차를 정의한다.

본 문서는 다음 목적을 가진다.

* 배포 자동화
* 품질 보장
* 배포 표준화
* 장애 예방
* 운영 안정성 확보
* AI 기반 자동 배포 지원

---

# 2. 적용 범위

| 구분        | 대상                |
| --------- | ----------------- |
| Source    | GitHub Repository |
| Frontend  | React PWA         |
| Backend   | API Server        |
| Database  | PostgreSQL        |
| Migration | Prisma            |
| Infra     | Docker            |
| Proxy     | Nginx             |
| CI/CD     | GitHub Actions    |

---

# 3. 관련 문서

* 배포정책.md
* 배포절차.md
* 버전관리정책.md
* 운영체크리스트.md
* 롤백정의.md
* 장애대응절차.md
* PWA배포정의.md
* 동기화운영정의.md

---

# 4. CI/CD 목표

## 자동화 대상

```text
소스 검증
↓
테스트
↓
빌드
↓
Docker 생성
↓
배포
↓
검증
```

---

## 수동 승인 대상

```text
운영 배포
롤백
DB 복구
```

---

# 5. 브랜치 전략

## 브랜치 구조

```text
main
develop
feature/**
fix/**
docs/**
codex/**
Claude/**
release/**
hotfix/**
```

---

## CI 허용 Branch Pattern

다음 branch pattern에서 CI를 실행한다.

| Pattern | 용도 |
| ------- | --- |
| main | 운영 배포 기준 |
| develop | 통합 개발 |
| feature/** | 기능 개발 |
| fix/** | 버그 수정 |
| docs/** | 문서 작업 |
| codex/** | Codex 작업 |
| Claude/** | Claude Code 작업 |
| release/** | 릴리즈 후보 |
| hotfix/** | 긴급 수정 |

---

## 배포 가능 브랜치

| 브랜치     | 배포      |
| ------- | ------- |
| main    | 운영      |
| develop | 개발      |
| release/** | Staging |
| feature/** | 불가      |
| fix/** | 불가      |
| docs/** | 불가      |
| codex/** | 불가      |
| Claude/** | 불가      |
| hotfix/** | Staging 또는 긴급 배포 승인 후 운영 |

---

# 6. CI 프로세스

## 코드 Push

발생 시

```text
Git Push
↓
CI 실행
```

---

## CI 단계

```text
Source Checkout
↓
Dependency Install
↓
Lint
↓
Unit Test
↓
Build
↓
Docker Build
```

---

# 7. 코드 품질 검증

## ESLint

실행

```bash
npm run lint
```

성공 조건

```text
Error 0
```

---

## Type Check

실행

```bash
npm run type-check
```

성공 조건

```text
Type Error 없음
```

---

## Unit Test

실행

```bash
npm run test
```

기준

```text
성공률 100%
```

---

# 8. Build 검증

## Frontend

```bash
npm run build
```

---

## Backend

```bash
npm run build
```

---

## 실패 조건

* Build Error
* Type Error
* Dependency Error

---

# 9. Docker Build

## Frontend

```bash
docker build -t kittywallet-web:1.0.0 .
```

---

## Backend

```bash
docker build -t kittywallet-api:1.0.0 .
```

---

## 검증

```bash
docker images
```

---

# 10. Docker Registry

## Push

```bash
docker push registry/kittywallet-web:1.0.0

docker push registry/kittywallet-api:1.0.0
```

---

## 규칙

금지

```text
latest
```

허용

```text
1.0.0
1.1.0
1.1.1
```

---

# 11. CD 프로세스

## 개발 환경

```text
develop
↓
자동 배포
```

---

## Staging

```text
release/**
↓
자동 배포
```

---

## Production

```text
main
↓
수동 승인
↓
배포
```

---

# 12. 운영 배포 절차

## STEP 1

Release 생성

예시

```text
v1.1.0
```

---

## STEP 2

Docker Pull

```bash
docker compose pull
```

---

## STEP 3

Container 교체

```bash
docker compose up -d
```

---

## STEP 4

Migration 수행

```bash
npx prisma migrate deploy
```

---

## STEP 5

Health Check

```http
GET /health
```

---

# 13. Prisma Migration 정책

## 적용 순서

```text
Migration
↓
Backend
↓
Frontend
```

---

## 금지

```sql
ALTER TABLE
UPDATE
DELETE
```

운영 DB 직접 실행 금지

---

# 14. PWA 배포 연계

배포 후 수행

## Manifest 확인

```text
Application
 └ Manifest
```

---

## Service Worker 확인

```text
Application
 └ Service Workers
```

---

## Cache 확인

```text
Application
 └ Cache Storage
```

---

# 15. 동기화 검증

배포 후 필수

확인

```text
IndexedDB
Sync Queue
Upload API
```

---

## 검증 항목

* Offline 저장
* Queue 생성
* Queue 제거
* 통계 반영

---

# 16. Health Check

## API

```http
GET /health
```

---

## 기대 결과

```json
{
  "status": "UP"
}
```

---

## 검증 항목

| 항목   | 상태   |
| ---- | ---- |
| API  | PASS |
| DB   | PASS |
| Auth | PASS |
| Sync | PASS |

---

# 17. 배포 실패

즉시 수행

```text
롤백정의.md
```

---

## 조건

* API 장애
* 로그인 불가
* Sync 장애
* DB Migration 실패

---

# 18. 보안 정책

## Secret 관리

허용

```text
GitHub Secret
Vault
```

---

금지

```text
Git 저장
소스코드 저장
문서 저장
```

---

# 19. 운영 승인

Production 배포 전

필수

| 역할 | 승인 |
| -- | -- |
| 개발 | □  |
| QA | □  |
| 운영 | □  |

---

# 20. AI 자동화 기준

## 수행 가능

* CI 실행
* 테스트 실행
* Build 수행
* Docker 생성
* Release Note 생성
* Health Check 수행

---

## 수행 금지

* 운영 DB 변경
* 운영 복구
* 운영 롤백
* 승인 없는 배포

---

# 21. 성공 기준

다음 조건 모두 충족

* CI 성공
* 테스트 성공
* Build 성공
* Docker 생성 성공
* Migration 성공
* Health Check 성공
* 운영 승인 완료

모든 조건 충족 시 배포 완료로 판단한다.

---

# 22. KittyWallet GitHub Actions 배포 파이프라인

## Workflow

```text
.github/workflows/deploy.yml
```

## Trigger

```text
main push
workflow_dispatch
```

운영 배포는 `main` 브랜치 push 시 자동 실행된다.
수동 재실행은 GitHub Actions의 `workflow_dispatch`로 수행한다.

## Docker Image

```text
ghcr.io/<owner>/kittywallet-api:<commit-sha>
ghcr.io/<owner>/kittywallet-web:<commit-sha>
```

`latest` 태그는 사용하지 않는다.

## Server Deploy

서버 배포 순서는 다음과 같다.

```text
Docker image build
Docker image push
deployment files upload
.env.production 생성
docker compose pull
docker compose up -d
Prisma migrate deploy
health check
```

## GitHub Actions Secrets

```text
DEPLOY_HOST
DEPLOY_USER
DEPLOY_SSH_KEY
DEPLOY_PORT
DEPLOY_PATH
PRODUCTION_ENV_FILE
```

`PRODUCTION_ENV_FILE`에는 `.env.production` 전체 내용을 저장한다.
`DEPLOY_PORT`는 선택값이며, 비어 있으면 22번 포트를 사용한다.
실제 secret 값은 저장소에 커밋하지 않는다.

## Notification

배포 성공/실패는 GitHub Actions annotation으로 표시한다.
실패 시 workflow job이 실패 상태가 되며 GitHub UI에서 확인한다.
