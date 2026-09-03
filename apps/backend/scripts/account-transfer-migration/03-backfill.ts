/**
 * [4단계 — 승인된 확정 매칭만 transferGroupId 백필] ⚠ 이 스크립트는 작성만 되어 있고 실행되지 않았다.
 *
 * 실행 전 반드시 확인:
 *   1) 이슈 #388(스키마 변경: TRANSACTION.transfer_group_id 컬럼 추가)이 대상 DB에 먼저 적용되어 있을 것
 *   2) DB 백업을 먼저 받았을 것 (--acknowledge-backup 플래그로 명시적 확인을 강제한다)
 *   3) 스테이징 환경에서 먼저 동일 절차로 검증했을 것
 *   4) 02-dry-run-match.ts가 만든 리포트를 사람이 검토하고, "확정 매칭" 중 실제로 반영할 항목만
 *      골라 approved-matches.json으로 저장했을 것 (검토 없이 dry-run 리포트를 그대로 넣지 말 것)
 *
 * transferGroupId 컬럼은 #388에서 추가되는 중이라 아직 이 리포지토리의 Prisma 스키마/클라이언트에는
 * 없을 수 있다. 이 스크립트는 그 필드가 "존재한다고 가정"하고 작성하되, Prisma Client 타입에 의존하지
 * 않도록 raw SQL을 사용하고, 실행 시작 시 information_schema로 컬럼 존재 여부를 직접 확인한다.
 * (컬럼명은 #388의 스키마에서 확정되는 대로 CANDIDATE_COLUMN_NAMES에 맞춰 조정 필요.)
 *
 * 실행(반영 전 미리보기, 아무 것도 쓰지 않음):
 *   DATABASE_URL=... npx ts-node --transpile-only scripts/account-transfer-migration/03-backfill.ts \
 *     --input reports/approved-matches.json
 *
 * 실행(실제 반영 — 백업 확인 + 명시적 동의 필요):
 *   DATABASE_URL=... npx ts-node --transpile-only scripts/account-transfer-migration/03-backfill.ts \
 *     --input reports/approved-matches.json --confirm --acknowledge-backup
 */
import * as fs from "fs";
import { createScriptPrismaClient } from "./db";
import { ConfirmedMatch } from "./types";

const CANDIDATE_COLUMN_NAMES = ["transfer_group_id"];

interface CliOptions {
  inputPath: string;
  confirm: boolean;
  acknowledgeBackup: boolean;
  skipMismatches: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const inputIdx = argv.indexOf("--input");
  if (inputIdx === -1 || !argv[inputIdx + 1]) {
    throw new Error("--input <approved-matches.json 경로>가 필요합니다.");
  }
  return {
    inputPath: argv[inputIdx + 1],
    confirm: argv.includes("--confirm"),
    acknowledgeBackup: argv.includes("--acknowledge-backup"),
    skipMismatches: argv.includes("--skip-mismatches")
  };
}

async function resolveTransferGroupColumn(prisma: ReturnType<typeof createScriptPrismaClient>) {
  // $queryRawUnsafe의 array bind(ANY($1))는 드라이버에 따라 타입 추론이 깨질 수 있어
  // placeholder를 개별로 풀어 IN (...)으로 바인딩한다 (transaction_id 조회와 동일한 이유).
  const placeholders = CANDIDATE_COLUMN_NAMES.map((_, i) => `$${i + 1}`).join(", ");
  const rows = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'TRANSACTION' AND column_name IN (${placeholders})`,
    ...CANDIDATE_COLUMN_NAMES
  );
  if (rows.length === 0) {
    throw new Error(
      `TRANSACTION 테이블에서 transferGroupId 컬럼(${CANDIDATE_COLUMN_NAMES.join(
        ", "
      )})을 찾을 수 없습니다. ` +
        `이슈 #388(스키마 변경)이 이 DB에 아직 적용되지 않은 것으로 보입니다. ` +
        `#388 머지 및 마이그레이션 적용 후 다시 실행하세요.`
    );
  }
  return rows[0].column_name;
}

function findDuplicateTransactionIds(approved: ConfirmedMatch[]): string[] {
  const seen = new Map<string, number>();
  for (const m of approved) {
    for (const id of [m.expense.transactionId, m.income.transactionId]) {
      seen.set(id, (seen.get(id) ?? 0) + 1);
    }
  }
  return [...seen.entries()].filter(([, count]) => count > 1).map(([id]) => id);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(opts.inputPath)) {
    throw new Error(`입력 파일을 찾을 수 없습니다: ${opts.inputPath}`);
  }
  const approved: ConfirmedMatch[] = JSON.parse(fs.readFileSync(opts.inputPath, "utf-8"));
  if (!Array.isArray(approved) || approved.length === 0) {
    console.log("승인된 확정 매칭이 없습니다. 종료합니다.");
    return;
  }

  // approved-matches.json 자체 내에서 동일 transactionId가 두 번 이상 쓰이면(승인 파일 작성 실수로
  // 같은 거래가 서로 다른 그룹에 중복 배정된 경우) DB를 건드리기 전에 즉시 중단한다.
  const duplicates = findDuplicateTransactionIds(approved);
  if (duplicates.length > 0) {
    throw new Error(
      `승인 파일 내에 중복 사용된 transactionId가 있습니다: ${duplicates.join(", ")}. ` +
        `승인 파일을 다시 검토하세요.`
    );
  }

  const prisma = createScriptPrismaClient();
  try {
    const columnName = await resolveTransferGroupColumn(prisma);
    console.log(`transferGroupId 컬럼 확인됨: TRANSACTION.${columnName}`);

    if (!opts.confirm) {
      console.log(
        `[미리보기 모드] --confirm 플래그가 없어 실제로 쓰지 않습니다. ` +
          `승인된 ${approved.length}쌍(${approved.length * 2}건)에 대해 아래와 같이 반영될 예정입니다:`
      );
      for (const m of approved) {
        console.log(
          `  groupId=${m.groupId}: EXPENSE txId=${m.expense.transactionId}, INCOME txId=${m.income.transactionId}`
        );
      }
      return;
    }

    if (!opts.acknowledgeBackup) {
      throw new Error(
        "--confirm과 함께 --acknowledge-backup 플래그가 필요합니다. " +
          "이 플래그는 '실행 전 DB 백업을 이미 받았음'을 명시적으로 확인하는 용도입니다. " +
          "백업 없이 이 스크립트를 실행하지 마세요."
      );
    }

    const auditLog: string[] = [];
    let updatedPairs = 0;
    let skippedPairs = 0;

    // 전체 승인분을 하나의 트랜잭션으로 묶는다: 도중에 어떤 쌍이라도 실패(및 --skip-mismatches
    // 미사용 시의 불일치)하면 이미 반영된 앞쪽 쌍들까지 전부 롤백되어, "일부만 반영된 상태"가
    // 남지 않도록 한다(all-or-nothing). --skip-mismatches로 의도적으로 건너뛴 쌍은 애초에 쓰지
    // 않으므로 롤백 대상이 아니다.
    await prisma.$transaction(
      async (tx) => {
        for (const m of approved) {
          const expenseId = BigInt(m.expense.transactionId);
          const incomeId = BigInt(m.income.transactionId);

          const current = await tx.$queryRawUnsafe<
            {
              transaction_id: bigint;
              deleted_yn: boolean;
              amount: unknown;
              wallet_id: bigint;
              wallet_type: string;
              user_id: bigint;
              category_id: bigint;
              transaction_type: string;
              transaction_date: Date;
              transfer_group_id: string | null;
            }[]
          >(
            `SELECT transaction_id, deleted_yn, amount, wallet_id, wallet_type, user_id, category_id,
                    transaction_type, transaction_date, ${columnName} AS transfer_group_id
             FROM "TRANSACTION" WHERE transaction_id IN ($1, $2)`,
            expenseId,
            incomeId
          );

          const problems = validatePairAgainstCurrentState(m, current);
          if (problems.length > 0) {
            skippedPairs++;
            const msg = `SKIP groupId=${m.groupId}: ${problems.join("; ")}`;
            auditLog.push(msg);
            console.warn(`⚠ ${msg}`);
            if (!opts.skipMismatches) {
              throw new Error(
                `승인 파일과 현재 DB 상태가 다릅니다 (${msg}). ` +
                  `안전을 위해 이미 이번 실행에서 반영된 쌍을 포함해 전체를 롤백합니다. ` +
                  `문제를 확인한 뒤 다시 실행하거나, 의도적으로 건너뛰려면 --skip-mismatches를 사용하세요.`
              );
            }
            continue;
          }

          await tx.$executeRawUnsafe(
            `UPDATE "TRANSACTION" SET ${columnName} = $1 WHERE transaction_id = $2`,
            m.groupId,
            expenseId
          );
          await tx.$executeRawUnsafe(
            `UPDATE "TRANSACTION" SET ${columnName} = $1 WHERE transaction_id = $2`,
            m.groupId,
            incomeId
          );

          updatedPairs++;
          auditLog.push(`OK groupId=${m.groupId}: expense=${expenseId}, income=${incomeId}`);
        }
      },
      { timeout: 5 * 60 * 1000 }
    );

    const logPath = `${opts.inputPath}.backfill-log-${Date.now()}.txt`;
    fs.writeFileSync(logPath, auditLog.join("\n") + "\n", "utf-8");

    console.log(`\n백필 완료: ${updatedPairs}쌍 반영, ${skippedPairs}쌍 건너뜀`);
    console.log(`감사 로그: ${logPath}`);
    console.log(
      "\n다음 단계: 04-snapshot.ts label=after 로 스냅샷을 뜨고, " +
        "05-compare-snapshots.ts로 백필 전(before) 스냅샷과 비교해 무결성을 검증한 뒤, " +
        "06-validate-groups.ts로 transferGroupId 그룹 구조(그룹당 정확히 EXPENSE 1 + INCOME 1, " +
        "동일 user/date/amount/category, 서로 다른 계좌)를 검증하세요."
    );
  } finally {
    await prisma.$disconnect();
  }
}

function validatePairAgainstCurrentState(
  m: ConfirmedMatch,
  // node-postgres/Prisma raw query는 numeric 컬럼을 Prisma.Decimal 객체로 반환한다 (string이 아님).
  // 문자열처럼 곧바로 비교하면 항상 불일치로 오판되므로 반드시 String()으로 정규화해서 비교해야 한다.
  current: {
    transaction_id: bigint;
    deleted_yn: boolean;
    amount: unknown;
    wallet_id: bigint;
    wallet_type: string;
    user_id: bigint;
    category_id: bigint;
    transaction_type: string;
    transaction_date: Date;
    transfer_group_id: string | null;
  }[]
): string[] {
  const problems: string[] = [];
  const byId = new Map(current.map((r) => [r.transaction_id.toString(), r]));

  const expenseRow = byId.get(m.expense.transactionId);
  const incomeRow = byId.get(m.income.transactionId);

  for (const [role, t, expectedType] of [
    ["expense", m.expense, "EXPENSE"],
    ["income", m.income, "INCOME"]
  ] as const) {
    const row = byId.get(t.transactionId);
    if (!row) {
      problems.push(`${role} txId=${t.transactionId}가 DB에 없음 (삭제되었거나 잘못된 ID)`);
      continue;
    }
    if (row.deleted_yn) {
      problems.push(`${role} txId=${t.transactionId}는 이미 삭제됨(deletedYn=true)`);
    }
    if (row.transfer_group_id !== null) {
      problems.push(`${role} txId=${t.transactionId}는 이미 transferGroupId=${row.transfer_group_id}로 설정되어 있음 (중복 반영 방지)`);
    }
    if (row.wallet_id.toString() !== t.walletId) {
      problems.push(`${role} txId=${t.transactionId}의 walletId가 승인 시점과 다름 (승인=${t.walletId}, 현재=${row.wallet_id})`);
    }
    if (String(row.amount) !== t.amount) {
      problems.push(`${role} txId=${t.transactionId}의 amount가 승인 시점과 다름 (승인=${t.amount}, 현재=${String(row.amount)})`);
    }
    if (row.user_id.toString() !== t.userId) {
      problems.push(`${role} txId=${t.transactionId}의 userId가 승인 시점과 다름 (승인=${t.userId}, 현재=${row.user_id})`);
    }
    if (row.category_id.toString() !== t.categoryId) {
      problems.push(`${role} txId=${t.transactionId}의 categoryId가 승인 시점과 다름 (승인=${t.categoryId}, 현재=${row.category_id})`);
    }
    if (row.wallet_type !== "ACCOUNT") {
      problems.push(`${role} txId=${t.transactionId}의 walletType이 ACCOUNT가 아님 (현재=${row.wallet_type})`);
    }
    if (row.transaction_type !== expectedType) {
      problems.push(
        `${role} txId=${t.transactionId}의 transactionType이 ${expectedType}가 아님 (현재=${row.transaction_type})`
      );
    }
    const currentDate = row.transaction_date.toISOString().slice(0, 10);
    const approvedDate = t.transactionDate.slice(0, 10);
    if (currentDate !== approvedDate) {
      problems.push(
        `${role} txId=${t.transactionId}의 transactionDate가 승인 시점과 다름 (승인=${approvedDate}, 현재=${currentDate})`
      );
    }
  }

  if (expenseRow && incomeRow && expenseRow.user_id.toString() !== incomeRow.user_id.toString()) {
    problems.push(
      `expense(userId=${expenseRow.user_id})와 income(userId=${incomeRow.user_id})의 userId가 서로 다름 — 동일 사용자 내 매칭 규칙 위반`
    );
  }
  if (expenseRow && incomeRow && expenseRow.wallet_id.toString() === incomeRow.wallet_id.toString()) {
    problems.push(`expense와 income이 동일 walletId(${expenseRow.wallet_id})를 사용함 — "서로 다른 계좌" 규칙 위반`);
  }

  return problems;
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
