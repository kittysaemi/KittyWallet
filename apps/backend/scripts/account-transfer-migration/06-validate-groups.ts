/**
 * [안전장치] 백필 후 transferGroupId 그룹의 구조적 정합성을 검증한다.
 * 04-snapshot.ts/05-compare-snapshots.ts는 거래 건수·잔액·카테고리 합계만 대조하므로
 * "그룹은 맞게 채워졌지만 잘못된 상대와 묶인" 경우를 잡지 못한다. 이 스크립트는 각
 * transferGroupId 그룹이 다음을 모두 만족하는지 직접 DB를 조회해 확인한다:
 *   - 그룹 멤버가 정확히 2건
 *   - EXPENSE 1건 + INCOME 1건
 *   - 동일 userId / categoryId / amount / transactionDate
 *   - 서로 다른 walletId (계좌), walletType은 둘 다 ACCOUNT
 *   - deletedYn=false
 * 하나라도 위반하면 비정상 종료(exit code 1)한다 — 운영 반영 승인 조건으로 사용.
 *
 * 실행: DATABASE_URL=... npx ts-node --transpile-only \
 *         scripts/account-transfer-migration/06-validate-groups.ts
 */
import { createScriptPrismaClient } from "./db";

interface GroupMemberRow {
  transfer_group_id: string;
  transaction_id: bigint;
  user_id: bigint;
  category_id: bigint;
  wallet_id: bigint;
  wallet_type: string;
  transaction_type: string;
  amount: unknown;
  transaction_date: Date;
  deleted_yn: boolean;
}

async function main() {
  const prisma = createScriptPrismaClient();
  try {
    const rows = await prisma.$queryRawUnsafe<GroupMemberRow[]>(
      `SELECT transfer_group_id, transaction_id, user_id, category_id, wallet_id, wallet_type,
              transaction_type, amount, transaction_date, deleted_yn
       FROM "TRANSACTION" WHERE transfer_group_id IS NOT NULL`
    );

    const byGroup = new Map<string, GroupMemberRow[]>();
    for (const r of rows) {
      const key = r.transfer_group_id;
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key)!.push(r);
    }

    const problems: string[] = [];
    for (const [groupId, members] of byGroup) {
      if (members.length !== 2) {
        problems.push(
          `groupId=${groupId}: 그룹 멤버가 2건이 아님 (${members.length}건) — txIds=${members
            .map((m) => m.transaction_id)
            .join(",")}`
        );
        continue;
      }

      const [a, b] = members;
      const types = [a.transaction_type, b.transaction_type].sort();
      if (types[0] !== "EXPENSE" || types[1] !== "INCOME") {
        problems.push(`groupId=${groupId}: EXPENSE 1 + INCOME 1 구성이 아님 (${a.transaction_type}, ${b.transaction_type})`);
      }
      if (a.user_id.toString() !== b.user_id.toString()) {
        problems.push(`groupId=${groupId}: userId 불일치 (${a.user_id} vs ${b.user_id})`);
      }
      if (a.category_id.toString() !== b.category_id.toString()) {
        problems.push(`groupId=${groupId}: categoryId 불일치 (${a.category_id} vs ${b.category_id})`);
      }
      if (String(a.amount) !== String(b.amount)) {
        problems.push(`groupId=${groupId}: amount 불일치 (${String(a.amount)} vs ${String(b.amount)})`);
      }
      const dateA = a.transaction_date.toISOString().slice(0, 10);
      const dateB = b.transaction_date.toISOString().slice(0, 10);
      if (dateA !== dateB) {
        problems.push(`groupId=${groupId}: transactionDate 불일치 (${dateA} vs ${dateB})`);
      }
      if (a.wallet_id.toString() === b.wallet_id.toString()) {
        problems.push(`groupId=${groupId}: 두 거래가 동일 walletId(${a.wallet_id})를 사용함 (서로 다른 계좌여야 함)`);
      }
      if (a.wallet_type !== "ACCOUNT" || b.wallet_type !== "ACCOUNT") {
        problems.push(`groupId=${groupId}: walletType이 ACCOUNT가 아닌 멤버 존재 (${a.wallet_type}, ${b.wallet_type})`);
      }
      if (a.deleted_yn || b.deleted_yn) {
        problems.push(`groupId=${groupId}: 삭제된(deletedYn=true) 멤버 존재`);
      }
    }

    console.log(`검사한 그룹 수: ${byGroup.size} (총 ${rows.length}건)`);

    if (problems.length > 0) {
      console.error(`\n❌ 그룹 구조 검증 실패 — ${problems.length}건 문제 발견:\n`);
      for (const p of problems) console.error(` - ${p}`);
      console.error(
        "\n위 문제가 있는 그룹은 운영 데이터가 잘못 연결된 상태입니다. " +
          "원인을 조사하기 전까지 이 상태를 최종 반영으로 간주하지 마세요."
      );
      process.exit(1);
    }

    console.log(
      "✅ 그룹 구조 검증 통과 — 모든 transferGroupId 그룹이 EXPENSE 1 + INCOME 1, " +
        "동일 user/date/amount/category, 서로 다른 계좌로 정상 구성되어 있습니다."
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
