/**
 * [안전장치] 마이그레이션(백필) 전/후 데이터 무결성 스냅샷.
 * 거래 건수, 계좌별 잔액, 카테고리별(유형별) 합계를 스냅샷으로 저장한다.
 * 03-backfill.ts는 transferGroupId 컬럼만 채우고 amount/walletId/deletedYn 등은 건드리지 않으므로
 * 정상적으로 실행됐다면 이 스냅샷은 백필 전/후 완전히 동일해야 한다 (transferGroupId 자체 제외).
 *
 * 실행:
 *   DATABASE_URL=... npx ts-node --transpile-only scripts/account-transfer-migration/04-snapshot.ts before
 *   (백필 실행)
 *   DATABASE_URL=... npx ts-node --transpile-only scripts/account-transfer-migration/04-snapshot.ts after
 */
import * as fs from "fs";
import * as path from "path";
import { createScriptPrismaClient } from "./db";

interface IntegritySnapshot {
  label: string;
  generatedAt: string;
  totalTransactionCount: number;
  transactionCountByUser: Record<string, number>;
  accountBalances: Record<string, string>;
  categorySumsByUserAndType: Record<string, string>;
}

async function buildSnapshot(label: string): Promise<IntegritySnapshot> {
  const prisma = createScriptPrismaClient();
  try {
    const transactions = await prisma.transaction.findMany({
      where: { deletedYn: false },
      select: { userId: true, categoryId: true, transactionType: true, amount: true }
    });

    const transactionCountByUser: Record<string, number> = {};
    const categorySumsByUserAndType: Record<string, string> = {};

    for (const t of transactions) {
      const userKey = t.userId.toString();
      transactionCountByUser[userKey] = (transactionCountByUser[userKey] ?? 0) + 1;

      const sumKey = `${userKey}:${t.categoryId.toString()}:${t.transactionType}`;
      const prev = categorySumsByUserAndType[sumKey]
        ? BigInt(categorySumsByUserAndType[sumKey])
        : 0n;
      // amount는 Decimal(15,0) — 소수부가 없으므로 BigInt 정수 합산으로 정밀도 손실 없이 처리
      categorySumsByUserAndType[sumKey] = (prev + BigInt(t.amount.toFixed(0))).toString();
    }

    const accounts = await prisma.account.findMany({
      where: { deletedYn: false },
      select: { accountId: true, currentBalance: true }
    });
    const accountBalances: Record<string, string> = {};
    for (const a of accounts) {
      accountBalances[a.accountId.toString()] = a.currentBalance.toString();
    }

    return {
      label,
      generatedAt: new Date().toISOString(),
      totalTransactionCount: transactions.length,
      transactionCountByUser,
      accountBalances,
      categorySumsByUserAndType
    };
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const label = process.argv[2];
  if (!label) {
    console.error("사용법: 04-snapshot.ts <label>  (예: before | after)");
    process.exit(1);
  }

  const snapshot = await buildSnapshot(label);
  const outDir = path.join(__dirname, "reports");
  fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, `integrity-snapshot-${label}.json`);
  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), "utf-8");

  console.log(`무결성 스냅샷("${label}") 저장 완료: ${filePath}`);
  console.log(`- 총 거래 건수: ${snapshot.totalTransactionCount}`);
  console.log(`- 대상 사용자 수: ${Object.keys(snapshot.transactionCountByUser).length}`);
  console.log(`- 계좌 수: ${Object.keys(snapshot.accountBalances).length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
