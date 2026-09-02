/**
 * [안전장치] 04-snapshot.ts로 만든 before/after 스냅샷을 비교해
 * 거래 건수, 계좌별 잔액, 카테고리별 합계가 동일한지 검증한다.
 * 하나라도 다르면 비정상 종료(exit code 1)한다 — 운영 반영 승인 조건으로 사용.
 *
 * 실행: npx ts-node --transpile-only scripts/account-transfer-migration/05-compare-snapshots.ts \
 *         reports/integrity-snapshot-before.json reports/integrity-snapshot-after.json
 */
import * as fs from "fs";

interface IntegritySnapshot {
  label: string;
  generatedAt: string;
  totalTransactionCount: number;
  transactionCountByUser: Record<string, number>;
  accountBalances: Record<string, string>;
  categorySumsByUserAndType: Record<string, string>;
}

function loadSnapshot(filePath: string): IntegritySnapshot {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function diffRecord(
  name: string,
  before: Record<string, string | number>,
  after: Record<string, string | number>
): string[] {
  const problems: string[] = [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    const b = before[key];
    const a = after[key];
    if (b === undefined) {
      problems.push(`[${name}] key=${key}: before에 없던 값이 after에 새로 생김 (after=${a})`);
    } else if (a === undefined) {
      problems.push(`[${name}] key=${key}: before에 있던 값이 after에서 사라짐 (before=${b})`);
    } else if (String(b) !== String(a)) {
      problems.push(`[${name}] key=${key}: before=${b} → after=${a} (불일치)`);
    }
  }
  return problems;
}

function main() {
  const [beforePath, afterPath] = process.argv.slice(2);
  if (!beforePath || !afterPath) {
    console.error(
      "사용법: 05-compare-snapshots.ts <before.json> <after.json>"
    );
    process.exit(1);
  }

  const before = loadSnapshot(beforePath);
  const after = loadSnapshot(afterPath);

  const problems: string[] = [];

  if (before.totalTransactionCount !== after.totalTransactionCount) {
    problems.push(
      `총 거래 건수 불일치: before=${before.totalTransactionCount} → after=${after.totalTransactionCount}`
    );
  }

  problems.push(...diffRecord("transactionCountByUser", before.transactionCountByUser, after.transactionCountByUser));
  problems.push(...diffRecord("accountBalances", before.accountBalances, after.accountBalances));
  problems.push(
    ...diffRecord("categorySumsByUserAndType", before.categorySumsByUserAndType, after.categorySumsByUserAndType)
  );

  if (problems.length > 0) {
    console.error("❌ 무결성 검증 실패 — 백필 전/후 데이터가 다릅니다:\n");
    for (const p of problems) console.error(` - ${p}`);
    console.error(
      "\n03-backfill.ts는 transferGroupId 외 컬럼을 절대 변경하지 않아야 합니다. " +
        "위 불일치가 발견되면 운영 반영을 중단하고 원인을 조사하세요."
    );
    process.exit(1);
  }

  console.log("✅ 무결성 검증 통과 — 거래 건수 / 계좌별 잔액 / 카테고리별 합계가 백필 전후 동일합니다.");
  console.log(`- before: ${before.label} (${before.generatedAt})`);
  console.log(`- after:  ${after.label} (${after.generatedAt})`);
}

main();
