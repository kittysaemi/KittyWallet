/**
 * Issue #392 — "계좌금액이동" 레거시 거래 매칭/마이그레이션 스크립트 공용 타입.
 * 모든 스크립트는 BigInt/Decimal을 문자열로 직렬화해 다룬다 (JSON-safe, 정밀도 손실 없음).
 */

export type TransactionTypeLiteral = "INCOME" | "EXPENSE";

export interface TransferCandidateTransaction {
  transactionId: string;
  userId: string;
  categoryId: string;
  walletId: string;
  transactionType: TransactionTypeLiteral;
  amount: string;
  transactionDate: string;
  createdAt: string;
}

export interface ConfirmedMatch {
  groupId: string;
  userId: string;
  timeDiffMs: number;
  expense: TransferCandidateTransaction;
  income: TransferCandidateTransaction;
}

export interface AmbiguousGroup {
  userId: string;
  timeDiffMs: number;
  reason: string;
  expenseCandidates: TransferCandidateTransaction[];
  incomeCandidates: TransferCandidateTransaction[];
}

export interface UnmatchedTransaction extends TransferCandidateTransaction {
  reason: string;
}

export interface MatchReportSummary {
  userCount: number;
  totalCandidateTransactions: number;
  confirmedPairs: number;
  confirmedTransactions: number;
  ambiguousGroups: number;
  ambiguousTransactions: number;
  unmatchedTransactions: number;
}

export interface MatchReport {
  generatedAt: string;
  categoryName: string;
  summary: MatchReportSummary;
  confirmed: ConfirmedMatch[];
  ambiguous: AmbiguousGroup[];
  unmatched: UnmatchedTransaction[];
}
