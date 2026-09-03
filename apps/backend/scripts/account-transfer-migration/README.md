# 계좌금액이동 레거시 데이터 마이그레이션 (이슈 #392)

사용자가 그동안 "계좌금액이동"이라는 일반 카테고리로 수동 등록해온 거래들(현재는 독립된
일반 수입/지출 거래) 중 짝(출금/입금)을 찾아 `transferGroupId`로 연결하기 위한 조사/매칭/백필 스크립트 모음.

**이 데이터는 이미 운영 중인 실사용자 데이터다. 어떤 단계에서도 기존 데이터가 삭제/변형되어
손상되면 안 된다.**

## 현재 진행 상태 (이 PR 기준)

| 단계 | 내용 | 상태 |
|---|---|---|
| 1단계 | 대상 추출 (읽기 전용 조사) | ✅ 완료 (`01-inspect.ts`) |
| 2단계 | 자동 매칭 (dry-run, DB 미변경) | ✅ 완료 (`02-dry-run-match.ts`) |
| 3단계 | 확정/애매/미매칭 3분류 | ✅ 완료 (dry-run 리포트에 포함) |
| 4단계 | 사람 검토 후 승인된 확정 건만 `transferGroupId` 백필 | ⛔ **스크립트만 작성, 실행하지 않음** |

> **2026-09-02 병합 전 리뷰에서 지적된 blocker 3건은 이 버전에서 반영됨** (PR #397 자체에는
> 반영되지 않은 채 머지되어, 운영 반영 전 이 세션에서 후속 수정함):
> 1. `03-backfill.ts`가 승인분 전체를 하나의 인터랙티브 트랜잭션으로 묶어 처리하도록 변경 —
>    도중 어떤 쌍이 실패해도 이미 반영된 앞쪽 쌍까지 전부 롤백된다(all-or-nothing).
> 2. 반영 직전 재검증 항목에 `userId`, `categoryId`, `walletType=ACCOUNT`, `transactionType`,
>    `transactionDate`, expense/income 간 userId 일치·walletId 불일치를 추가하고, 승인 파일
>    내 동일 transactionId 중복 사용을 사전 차단하도록 보강.
> 3. `06-validate-groups.ts`를 신규 추가 — 백필 후 각 `transferGroupId` 그룹이 정확히
>    EXPENSE 1 + INCOME 1, 동일 user/date/amount/category, 서로 다른 계좌로 구성됐는지 검증.

> **4단계(`03-backfill.ts`)는 절대 이 PR에서 실행되지 않았다.**
> `Transaction.transferGroupId` 필드는 이슈 #388(스키마 변경, 별도 세션에서 병렬 진행 중)이
> 아직 스키마에 추가하는 중이라 이 저장소의 Prisma 스키마에는 존재하지 않는다.
> `03-backfill.ts`는 그 필드가 존재한다고 "가정"하고 raw SQL로 작성해 두었고, 실행 시작 시
> `information_schema`로 컬럼 존재 여부를 직접 확인해 없으면 즉시 중단하도록 만들었다.
>
> **실행 순서(이 PR 이후 필요한 절차):**
> 1. 이슈 #388 머지 및 대상 DB에 마이그레이션 적용
> 2. 운영 DB를 대상으로 `01-inspect.ts` → `02-dry-run-match.ts` 실행 (읽기 전용, dry-run)
> 3. 생성된 dry-run 리포트를 **사람이 검토/승인**하고, 반영할 확정 매칭만 골라
>    `approved-matches.json`으로 저장 (승인 기록을 이슈/PR에 남길 것)
> 4. **DB 백업**
> 5. **스테이징 환경**에서 동일 절차(백필 + 04/05 검증 스크립트)로 먼저 검증
> 6. 스테이징 검증 통과 후에만 운영 DB에 `03-backfill.ts --confirm --acknowledge-backup` 실행
> 7. `04-snapshot.ts after` + `05-compare-snapshots.ts`로 백필 전/후 무결성 대조,
>    `06-validate-groups.ts`로 그룹 구조 검증 및 결과 첨부

## 매칭 규칙 (이슈 #392 본문 기준)

같은 `userId` 내에서 아래를 모두 만족하는 EXPENSE 1건 + INCOME 1건을 후보로 등록한다.

- `amount` 동일 (Decimal 정확히 일치)
- `walletId`(계좌)가 서로 다름
- `transactionDate`가 같은 날짜

후보들을 시간차가 작은 순으로 정렬해 그리디 1:1 매칭한다 (매칭된 건은 후보 풀에서 제거).

- **확정 매칭**: 특정 시간차 구간에서 후보가 유일하게 하나로 정해지는 경우
- **애매**: 동일 시간차에 후보가 2건 이상 동시에 존재 → 자동 매칭하지 않고 "검토 필요" 목록으로 분리
- **미매칭**: 짝을 찾지 못한 단일 거래 → 그대로 일반 거래로 두고 "미매칭" 목록으로 표시

### ⚠️ 사람 검토가 필요한 해석/가정 (이슈 본문에 명시되지 않음)

- `transactionDate` 컬럼은 시각 정보가 없는 `DATE` 타입이라 "시간차가 작은 순" 정렬 기준을
  그 자체로는 계산할 수 없다. 이 스크립트는 실제 등록 시각인 `createdAt`의 차이를 시간차로
  사용한다. 다른 기준(예: 거래 생성 순서, transactionId 순서)을 원한다면 `matcher.ts`의
  `buildCandidatePairs`를 조정해야 한다.
- `transferGroupId` 그룹 식별자는 두 거래 중 더 작은 `transactionId`를 재사용한다
  (`matcher.ts`의 `makeGroupId`). #388에서 확정되는 실제 필드 타입/채번 정책과 다를 수 있으므로
  #388 머지 후 반드시 재확인할 것.
- "애매"로 분류된 거래는 해당 시간차 구간에서 후보 풀에서 완전히 제외되고, 더 큰 시간차의
  다른 후보와도 매칭을 시도하지 않는다 (보수적 처리).

## 스크립트 목록

| 파일 | 단계 | DB 쓰기 여부 |
|---|---|---|
| `01-inspect.ts` | 1단계 — 대상 현황 조사 | 없음 (읽기 전용) |
| `02-dry-run-match.ts` | 2·3단계 — dry-run 매칭 + 3분류 리포트 생성 | 없음 (읽기 전용) |
| `03-backfill.ts` | 4단계 — 승인된 확정 건 `transferGroupId` 백필 | **있음** (`--confirm` 없이는 미리보기만) |
| `04-snapshot.ts` | 안전장치 — 무결성 스냅샷(건수/잔액/합계) | 없음 (읽기 전용) |
| `05-compare-snapshots.ts` | 안전장치 — 백필 전/후 스냅샷 대조 | 없음 (파일 비교만) |
| `06-validate-groups.ts` | 안전장치 — transferGroupId 그룹 구조 검증 | 없음 (읽기 전용) |
| `matcher.ts` | 매칭 알고리즘 (순수 함수, 단위 테스트 대상) | - |
| `types.ts`, `db.ts`, `report-writer.ts` | 공용 타입/Prisma 클라이언트/리포트 출력 | - |

## 실행 방법

모든 스크립트는 `apps/backend` 디렉토리에서 `DATABASE_URL` 환경변수로 대상 DB를 명시적으로
지정해 실행한다 (실수로 운영 DB에 연결되는 사고를 막기 위해 `DATABASE_URL`이 없으면 즉시 에러).

```bash
cd apps/backend

# 1단계: 현황 조사 (읽기 전용)
DATABASE_URL="postgresql://..." npx ts-node --transpile-only \
  scripts/account-transfer-migration/01-inspect.ts

# 2·3단계: dry-run 매칭 + 리포트 생성 (읽기 전용, DB 미변경)
DATABASE_URL="postgresql://..." npx ts-node --transpile-only \
  scripts/account-transfer-migration/02-dry-run-match.ts scripts/account-transfer-migration/reports

# (사람 검토 후) 승인된 확정 매칭만 approved-matches.json으로 별도 저장
# scripts/account-transfer-migration/reports/dry-run-report-*.json 의 "confirmed" 배열에서
# 검토를 거쳐 반영할 항목만 골라 approved-matches.json으로 저장한다.

# 4단계: 백필 — #388 머지 및 스테이징 검증 전까지 실행 금지
DATABASE_URL="postgresql://..." npx ts-node --transpile-only \
  scripts/account-transfer-migration/03-backfill.ts --input scripts/account-transfer-migration/reports/approved-matches.json
  # (미리보기만 됨. 실제 반영은 --confirm --acknowledge-backup 플래그 추가 필요)

# 안전장치: 백필 전/후 무결성 대조
DATABASE_URL="postgresql://..." npx ts-node --transpile-only \
  scripts/account-transfer-migration/04-snapshot.ts before
# (백필 실행)
DATABASE_URL="postgresql://..." npx ts-node --transpile-only \
  scripts/account-transfer-migration/04-snapshot.ts after
npx ts-node --transpile-only \
  scripts/account-transfer-migration/05-compare-snapshots.ts \
  scripts/account-transfer-migration/reports/integrity-snapshot-before.json \
  scripts/account-transfer-migration/reports/integrity-snapshot-after.json

# 안전장치: transferGroupId 그룹 구조 검증 (백필 후)
DATABASE_URL="postgresql://..." npx ts-node --transpile-only \
  scripts/account-transfer-migration/06-validate-groups.ts
```

`--transpile-only`를 쓰는 이유: `03-backfill.ts`는 아직 스키마에 없는 `transferGroupId`
필드를 raw SQL로 다루기 때문에(Prisma Client 타입에 의존하지 않음), 그리고 이 스크립트들은
`apps/backend/tsconfig.json`의 `include`(=`src`) 밖에 있어 `npm run type-check` / `npm run build`
대상에 포함되지 않는다.

## 안전장치 요약

- 모든 리포트/스냅샷은 `scripts/account-transfer-migration/reports/`에 생성되며, 이 디렉토리는
  실사용자 거래 데이터를 담을 수 있으므로 **`.gitignore`에 등록되어 git에 커밋되지 않는다.**
- `03-backfill.ts`는
  - `information_schema`로 `transferGroupId` 컬럼 존재를 확인 후에만 진행
  - `--confirm` 없이는 아무 것도 쓰지 않고 무엇을 반영할지 미리보기만 출력
  - `--confirm`을 줘도 `--acknowledge-backup`(백업 완료 확인) 없이는 즉시 에러로 중단
  - 승인 파일 내 동일 transactionId 중복 사용을 DB 접근 전에 사전 차단
  - 각 쌍을 반영하기 전 현재 DB 상태(삭제 여부, 금액, 계좌, `userId`/`categoryId`/`walletType`/
    `transactionType`/`transactionDate`, expense·income 간 userId 일치·walletId 불일치, 기존
    `transferGroupId` 유무)를 승인 시점 데이터와 대조해 어긋나면 기본적으로 전체 중단
    (`--skip-mismatches`로만 우회 가능)
  - **승인분 전체를 하나의 인터랙티브 트랜잭션으로 처리**해 all-or-nothing을 보장함 — 도중
    어떤 쌍이 실패해도 이미 반영된 앞쪽 쌍까지 전부 롤백되어 "일부만 반영된 상태"가 남지 않음
  - `transferGroupId` 외 컬럼은 절대 SET하지 않음(`updatedAt` 포함 — 기존 컬럼 값 불변 원칙)
  - 반영 내역을 감사 로그 파일로 저장
- `04-snapshot.ts` / `05-compare-snapshots.ts`로 백필 전/후 거래 건수·계좌별 잔액·카테고리별
  합계가 완전히 동일한지 기계적으로 검증 (하나라도 다르면 실패 종료)
- `06-validate-groups.ts`로 백필 후 각 `transferGroupId` 그룹이 정확히 EXPENSE 1 + INCOME 1,
  동일 user/date/amount/category, 서로 다른 계좌로 구성됐는지 검증 (건수/잔액 대조만으로는
  "그룹은 채워졌지만 잘못된 상대와 묶인" 경우를 잡을 수 없어 별도로 필요)

## 로컬 검증 (더미 데이터)

실제 운영 데이터 없이 매칭 알고리즘(`matcher.ts`)의 정확성만 로컬 PostgreSQL + 더미 데이터로
검증했다 (진행 기록은 PR 설명 참고). 운영 데이터에 대한 dry-run은 #388 머지 후 실제 운영/스테이징
DB 접근 권한이 있는 환경에서 별도로 수행해야 한다.
