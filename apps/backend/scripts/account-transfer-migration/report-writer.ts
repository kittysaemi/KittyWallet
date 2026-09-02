import * as fs from "fs";
import * as path from "path";
import { MatchReport } from "./types";

export function writeJsonReport(report: MatchReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, `dry-run-report-${timestampForFilename(report.generatedAt)}.json`);
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), "utf-8");
  return filePath;
}

export function writeMarkdownSummary(report: MatchReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, `dry-run-summary-${timestampForFilename(report.generatedAt)}.md`);

  const lines: string[] = [];
  lines.push(`# 계좌금액이동 dry-run 매칭 리포트`);
  lines.push("");
  lines.push(`- 생성 시각: ${report.generatedAt}`);
  lines.push(`- 대상 카테고리명: "${report.categoryName}"`);
  lines.push(`- 대상 사용자 수: ${report.summary.userCount}`);
  lines.push(`- 대상 거래 총 건수: ${report.summary.totalCandidateTransactions}`);
  lines.push("");
  lines.push(`## 요약`);
  lines.push("");
  lines.push(`| 구분 | 쌍(그룹) 수 | 거래 건수 |`);
  lines.push(`|---|---|---|`);
  lines.push(`| 확정 매칭 | ${report.summary.confirmedPairs} | ${report.summary.confirmedTransactions} |`);
  lines.push(`| 애매(검토 필요) | ${report.summary.ambiguousGroups} | ${report.summary.ambiguousTransactions} |`);
  lines.push(`| 미매칭 | - | ${report.summary.unmatchedTransactions} |`);
  lines.push("");

  lines.push(`## 확정 매칭 (${report.confirmed.length}건)`);
  lines.push("");
  if (report.confirmed.length === 0) {
    lines.push("_없음_");
  } else {
    lines.push(`| groupId(제안) | userId | 날짜 | 금액 | EXPENSE txId (walletId) | INCOME txId (walletId) | 시간차(ms) |`);
    lines.push(`|---|---|---|---|---|---|---|`);
    for (const m of report.confirmed) {
      lines.push(
        `| ${m.groupId} | ${m.userId} | ${m.expense.transactionDate} | ${m.expense.amount} | ` +
          `${m.expense.transactionId} (${m.expense.walletId}) | ${m.income.transactionId} (${m.income.walletId}) | ${m.timeDiffMs} |`
      );
    }
  }
  lines.push("");

  lines.push(`## 애매 — 검토 필요 (${report.ambiguous.length}개 그룹)`);
  lines.push("");
  if (report.ambiguous.length === 0) {
    lines.push("_없음_");
  } else {
    for (const [idx, g] of report.ambiguous.entries()) {
      lines.push(`### 그룹 ${idx + 1} — userId=${g.userId}, 시간차=${g.timeDiffMs}ms`);
      lines.push(`- 사유: ${g.reason}`);
      lines.push(
        `- EXPENSE 후보: ${g.expenseCandidates.map((t) => `${t.transactionId}(${t.walletId})`).join(", ")}`
      );
      lines.push(
        `- INCOME 후보: ${g.incomeCandidates.map((t) => `${t.transactionId}(${t.walletId})`).join(", ")}`
      );
      lines.push("");
    }
  }

  lines.push(`## 미매칭 (${report.unmatched.length}건)`);
  lines.push("");
  if (report.unmatched.length === 0) {
    lines.push("_없음_");
  } else {
    lines.push(`| userId | txId | 유형 | 날짜 | 금액 | walletId |`);
    lines.push(`|---|---|---|---|---|---|`);
    for (const t of report.unmatched) {
      lines.push(
        `| ${t.userId} | ${t.transactionId} | ${t.transactionType} | ${t.transactionDate} | ${t.amount} | ${t.walletId} |`
      );
    }
  }
  lines.push("");

  fs.writeFileSync(filePath, lines.join("\n"), "utf-8");
  return filePath;
}

function timestampForFilename(iso: string): string {
  return iso.replace(/[:.]/g, "-");
}
