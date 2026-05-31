# Hotfix정책.md

# 1. 문서 목적

본 문서는 운영 환경 긴급 수정(Hotfix) 정책을 정의한다.

Hotfix는 운영 장애 복구를 목적으로 하며 일반 기능 개발과 구분한다.

---

# 2. 적용 범위

* Frontend(PWA)
* Backend API
* Docker Image
* Service Worker

---

# 3. Hotfix 정의

Hotfix란 운영 서비스 장애를 신속하게 해결하기 위한 긴급 배포를 의미한다.

---

# 4. Hotfix 적용 가능 조건

## P1 장애

예시

* 로그인 불가
* 서비스 중단
* DB 오류

---

## P2 장애

예시

* 거래 등록 실패
* Sync 실패
* 통계 오류

---

## 보안 이슈

예시

* 인증 우회
* 개인정보 노출

---

# 5. Hotfix 금지 사항

금지

* 신규 기능 추가
* UI 개선
* 리팩토링
* 구조 변경

허용

* 장애 수정
* 보안 수정
* 긴급 버그 수정

---

# 6. 브랜치 정책

```text
main
 ↓
hotfix/*
 ↓
main
```

예시

```text
hotfix/login-fail
hotfix/sync-error
```

---

# 7. Hotfix 절차

## STEP 1

장애 확인

장애대응절차.md 수행

---

## STEP 2

Hotfix 승인

승인자

| 역할 | 승인 |
| -- | -- |
| 개발 | 필수 |
| 운영 | 필수 |

---

## STEP 3

브랜치 생성

```bash
git checkout main

git checkout -b hotfix/login-fail
```

---

## STEP 4

수정

규칙

* 최소 수정 원칙
* 영향 범위 최소화

---

## STEP 5

테스트

필수

* Unit Test
* API Test
* 회귀 테스트

---

## STEP 6

배포

배포절차.md 수행

---

# 8. Hotfix 검증

필수 검증

| 항목    | 확인   |
| ----- | ---- |
| 로그인   | PASS |
| 거래 등록 | PASS |
| 거래 조회 | PASS |
| Sync  | PASS |

---

# 9. 버전 정책

Hotfix는 PATCH 증가

예시

```text
1.0.0
 ↓
1.0.1
```

```text
1.2.3
 ↓
1.2.4
```

---

# 10. 배포 실패

배포 실패 시

즉시

```text
롤백정의.md
```

수행

---

# 11. Hotfix 완료 절차

완료 후

```text
hotfix/*
 ↓
main 병합
 ↓
태그 생성
 ↓
릴리즈 노트 작성
```

---

# 12. Hotfix 기록

필수 보관

| 항목        | 내용 |
| --------- | -- |
| Hotfix 번호 |    |
| 원인        |    |
| 수정 내용     |    |
| 배포 버전     |    |
| 담당자       |    |
| 배포 일시     |    |

---

# 13. AI 자동화 기준

AI 수행 가능

* 브랜치 생성
* 테스트 수행
* 릴리즈 노트 작성

AI 수행 금지

* 승인 없는 운영 배포
* DB 수정
* 강제 롤백
