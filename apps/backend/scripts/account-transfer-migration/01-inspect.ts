/**
 * [1단계 — 대상 추출, 읽기 전용]
 * "계좌금액이동" 카테고리로 등록된 거래 현황을 조사한다. DB에 어떤 쓰기도 하지 않는다.
 *
 * 실행: DATABASE_URL=... npx ts-node --transpile-only scripts/account-transfer-migration/01-inspect.ts
 */
import { createScriptPrismaClient, TRANSFER_CATEGORY_NAME } from "./db";

async function main() {
  const prisma = createScriptPrismaClient();

  try {
    const categories = await prisma.category.findMany({
      where: { categoryName: TRANSFER_CATEGORY_NAME }
    });

    console.log(`대상 카테고리("${TRANSFER_CATEGORY_NAME}") 수: ${categories.length}`);
    if (categories.length === 0) {
      console.log("대상 카테고리가 없습니다. 조사할 거래가 없습니다.");
      return;
    }

    const categoryIds = categories.map((c) => c.categoryId);

    const transactions = await prisma.transaction.findMany({
      where: {
        categoryId: { in: categoryIds },
        walletType: "ACCOUNT",
        deletedYn: false
      },
      orderBy: [{ userId: "asc" }, { transactionDate: "asc" }]
    });

    console.log(`대상 거래(walletType=ACCOUNT, deletedYn=false) 수: ${transactions.length}`);

    const byUser = new Map<string, typeof transactions>();
    for (const t of transactions) {
      const key = t.userId.toString();
      if (!byUser.has(key)) byUser.set(key, []);
      byUser.get(key)!.push(t);
    }

    console.log(`대상 사용자 수: ${byUser.size}`);
    console.log("");
    console.log("userId\tEXPENSE건\tINCOME건\t합계\t날짜범위");

    for (const [userId, txs] of byUser) {
      const expenseCount = txs.filter((t) => t.transactionType === "EXPENSE").length;
      const incomeCount = txs.filter((t) => t.transactionType === "INCOME").length;
      const dates = txs.map((t) => t.transactionDate.toISOString().slice(0, 10)).sort();
      const range = dates.length > 0 ? `${dates[0]} ~ ${dates[dates.length - 1]}` : "-";
      console.log(`${userId}\t${expenseCount}\t${incomeCount}\t${txs.length}\t${range}`);

      if (expenseCount !== incomeCount) {
        console.log(
          `  ⚠ userId=${userId}: EXPENSE(${expenseCount})와 INCOME(${incomeCount}) 건수가 다릅니다. ` +
            `짝을 이루지 못하는 거래가 있을 가능성이 높습니다 (2단계 dry-run에서 상세 확인).`
        );
      }
    }

    const nonAccountSanityCheck = await prisma.transaction.count({
      where: { categoryId: { in: categoryIds }, deletedYn: false, walletType: { not: "ACCOUNT" } }
    });
    if (nonAccountSanityCheck > 0) {
      console.log(
        `\n⚠ walletType=ACCOUNT가 아닌 "${TRANSFER_CATEGORY_NAME}" 거래가 ${nonAccountSanityCheck}건 있습니다 ` +
          `(CARD 지갑 거래로 추정 — 이슈 범위(계좌간 이동) 밖이므로 이번 마이그레이션 대상에서 제외됨).`
      );
    }

    console.log("\n(읽기 전용 조사 완료 — DB에 아무 것도 쓰지 않았습니다.)");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
