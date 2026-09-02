/**
 * [2단계 dry-run 매칭 + 3단계 3분류]
 * "계좌금액이동" 거래들 중 짝(출금/입금)을 매칭 후보로 찾아 확정/애매/미매칭으로 분류한다.
 * DB에는 어떤 것도 쓰지 않는다 — 결과는 JSON/Markdown 리포트 파일로만 출력한다.
 *
 * 실행: DATABASE_URL=... npx ts-node --transpile-only scripts/account-transfer-migration/02-dry-run-match.ts [출력디렉토리]
 * 기본 출력 디렉토리는 ./reports (git에 커밋하지 말 것 — 실사용자 거래 데이터 포함, .gitignore 처리됨)
 */
import * as path from "path";
import { createScriptPrismaClient, TRANSFER_CATEGORY_NAME } from "./db";
import { matchTransfersForUser } from "./matcher";
import { writeJsonReport, writeMarkdownSummary } from "./report-writer";
import { MatchReport, TransferCandidateTransaction } from "./types";

async function main() {
  const outDir = process.argv[2] ?? path.join(__dirname, "reports");
  const prisma = createScriptPrismaClient();

  try {
    const categories = await prisma.category.findMany({
      where: { categoryName: TRANSFER_CATEGORY_NAME }
    });
    const categoryIds = categories.map((c) => c.categoryId);

    if (categoryIds.length === 0) {
      console.log(`"${TRANSFER_CATEGORY_NAME}" 카테고리가 없어 매칭할 대상이 없습니다.`);
      return;
    }

    const rows = await prisma.transaction.findMany({
      where: {
        categoryId: { in: categoryIds },
        walletType: "ACCOUNT",
        deletedYn: false
      },
      orderBy: [{ userId: "asc" }, { createdAt: "asc" }]
    });

    const candidates: TransferCandidateTransaction[] = rows.map((t) => ({
      transactionId: t.transactionId.toString(),
      userId: t.userId.toString(),
      categoryId: t.categoryId.toString(),
      walletId: t.walletId.toString(),
      transactionType: t.transactionType,
      amount: t.amount.toString(),
      transactionDate: t.transactionDate.toISOString().slice(0, 10),
      createdAt: t.createdAt.toISOString()
    }));

    const byUser = new Map<string, TransferCandidateTransaction[]>();
    for (const c of candidates) {
      if (!byUser.has(c.userId)) byUser.set(c.userId, []);
      byUser.get(c.userId)!.push(c);
    }

    const report: MatchReport = {
      generatedAt: new Date().toISOString(),
      categoryName: TRANSFER_CATEGORY_NAME,
      summary: {
        userCount: byUser.size,
        totalCandidateTransactions: candidates.length,
        confirmedPairs: 0,
        confirmedTransactions: 0,
        ambiguousGroups: 0,
        ambiguousTransactions: 0,
        unmatchedTransactions: 0
      },
      confirmed: [],
      ambiguous: [],
      unmatched: []
    };

    for (const [, txs] of byUser) {
      const result = matchTransfersForUser(txs);
      report.confirmed.push(...result.confirmed);
      report.ambiguous.push(...result.ambiguous);
      report.unmatched.push(...result.unmatched);
    }

    report.summary.confirmedPairs = report.confirmed.length;
    report.summary.confirmedTransactions = report.confirmed.length * 2;
    report.summary.ambiguousGroups = report.ambiguous.length;
    report.summary.ambiguousTransactions = report.ambiguous.reduce(
      (sum, g) => sum + g.expenseCandidates.length + g.incomeCandidates.length,
      0
    );
    report.summary.unmatchedTransactions = report.unmatched.length;

    const jsonPath = writeJsonReport(report, outDir);
    const mdPath = writeMarkdownSummary(report, outDir);

    console.log("dry-run 매칭 완료 (DB에 아무 것도 쓰지 않았습니다).");
    console.log(`- 대상 사용자: ${report.summary.userCount}명, 대상 거래: ${report.summary.totalCandidateTransactions}건`);
    console.log(`- 확정 매칭: ${report.summary.confirmedPairs}쌍 (${report.summary.confirmedTransactions}건)`);
    console.log(`- 애매(검토 필요): ${report.summary.ambiguousGroups}그룹 (${report.summary.ambiguousTransactions}건)`);
    console.log(`- 미매칭: ${report.summary.unmatchedTransactions}건`);
    console.log(`- JSON 리포트: ${jsonPath}`);
    console.log(`- Markdown 요약: ${mdPath}`);
    console.log(
      "\n다음 단계: 위 리포트를 사람이 검토/승인한 뒤, 승인된 확정 매칭만 골라 " +
        "approved-matches.json으로 저장하여 03-backfill.ts 입력으로 사용하세요 " +
        "(#388 스키마 반영 및 스테이징 검증 전까지 03-backfill.ts는 실행하지 마세요)."
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
