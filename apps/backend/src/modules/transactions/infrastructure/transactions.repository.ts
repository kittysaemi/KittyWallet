import { Injectable } from "@nestjs/common";
import {
  Account,
  Card,
  CardInstallment,
  Category,
  Prisma,
  Transaction,
  TransactionType,
  WalletType
} from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";
import { BalanceViolationError } from "../domain/errors";

export type TransactionWithCategory = Transaction & { category: Category };
export type TransactionWithInstallment = Transaction & {
  category: Category;
  cardInstallment: CardInstallment | null;
};

export interface FindTransactionsCondition {
  userId: bigint;
  startDate?: Date;
  endDate?: Date;
  keyword?: string;
  walletType?: WalletType;
  walletId?: bigint;
  categoryId?: bigint;
  transactionType?: TransactionType;
}

export interface CreateTransactionInput {
  userId: bigint;
  categoryId: bigint;
  walletId: bigint;
  transactionType: TransactionType;
  walletType: WalletType;
  amount: number;
  transactionDate: Date;
  memo?: string | null;
  syncedAt?: Date | null;
  syncClientId?: bigint | null;
  clientTempId?: string | null;
  installmentId?: bigint | null;
  installmentSeq?: number | null;
  installmentTotalCount?: number | null;
}

export interface CreateInstallmentInput {
  userId: bigint;
  cardId: bigint;
  categoryId: bigint;
  originalAmount: number;
  installmentMonths: number;
  purchaseDate: Date;
  memo?: string | null;
  syncClientId?: bigint | null;
  clientTempId?: string | null;
}

export type AccountBalanceTransaction = Pick<
  Transaction,
  "transactionId" | "transactionType" | "amount" | "transactionDate"
>;

@Injectable()
export class TransactionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(condition: FindTransactionsCondition): Prisma.TransactionWhereInput {
    const dateFilter: Prisma.DateTimeFilter | undefined =
      condition.startDate || condition.endDate
        ? {
            ...(condition.startDate ? { gte: condition.startDate } : {}),
            ...(condition.endDate ? { lte: condition.endDate } : {})
          }
        : undefined;

    return {
      userId: condition.userId,
      deletedYn: false,
      ...(dateFilter ? { transactionDate: dateFilter } : {}),
      ...(condition.keyword ? { memo: { contains: condition.keyword, mode: "insensitive" } } : {}),
      ...(condition.walletType ? { walletType: condition.walletType } : {}),
      ...(condition.walletId ? { walletId: condition.walletId } : {}),
      ...(condition.categoryId ? { categoryId: condition.categoryId } : {}),
      ...(condition.transactionType ? { transactionType: condition.transactionType } : {})
    };
  }

  findMany(
    condition: FindTransactionsCondition,
    page: number,
    limit: number,
    orderBy: Prisma.TransactionOrderByWithRelationInput[]
  ): Promise<TransactionWithInstallment[]> {
    return this.prisma.transaction.findMany({
      where: this.buildWhere(condition),
      include: { category: true, cardInstallment: true },
      orderBy,
      skip: (page - 1) * limit,
      take: limit
    });
  }

  count(condition: FindTransactionsCondition): Promise<number> {
    return this.prisma.transaction.count({ where: this.buildWhere(condition) });
  }

  findById(transactionId: bigint, userId: bigint): Promise<TransactionWithInstallment | null> {
    return this.prisma.transaction.findFirst({
      where: { transactionId, userId, deletedYn: false },
      include: { category: true, cardInstallment: true }
    });
  }

  findRecent(userId: bigint, limit: number): Promise<TransactionWithInstallment[]> {
    return this.prisma.transaction.findMany({
      where: { userId, deletedYn: false },
      include: { category: true, cardInstallment: true },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      take: limit
    });
  }

  findInstallmentTransactions(installmentId: bigint, userId: bigint): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: { installmentId, userId, deletedYn: false },
      orderBy: [{ installmentSeq: "asc" }]
    });
  }

  createInstallmentWithTransactions(
    installmentInput: CreateInstallmentInput,
    now: Date
  ): Promise<{ installment: CardInstallment; transactions: Transaction[] }> {
    return this.prisma.$transaction(async (tx) => {
      const installment = await tx.cardInstallment.create({
        data: {
          user: { connect: { userId: installmentInput.userId } },
          card: { connect: { cardId: installmentInput.cardId } },
          category: { connect: { categoryId: installmentInput.categoryId } },
          originalAmount: installmentInput.originalAmount,
          installmentMonths: installmentInput.installmentMonths,
          purchaseDate: installmentInput.purchaseDate,
          memo: installmentInput.memo ?? null,
          deletedYn: false
        }
      });

      const baseAmount = Math.floor(
        installmentInput.originalAmount / installmentInput.installmentMonths
      );
      const remainder =
        installmentInput.originalAmount -
        baseAmount * installmentInput.installmentMonths;

      const transactions: Transaction[] = [];
      for (let seq = 1; seq <= installmentInput.installmentMonths; seq++) {
        const amount = seq === 1 ? baseAmount + remainder : baseAmount;
        const txDate = new Date(installmentInput.purchaseDate);
        txDate.setMonth(txDate.getMonth() + seq - 1);

        const transaction = await tx.transaction.create({
          data: {
            user: { connect: { userId: installmentInput.userId } },
            category: { connect: { categoryId: installmentInput.categoryId } },
            walletId: installmentInput.cardId,
            transactionType: "EXPENSE",
            walletType: "CARD",
            amount,
            transactionDate: txDate,
            memo: installmentInput.memo ?? null,
            cardInstallment: { connect: { installmentId: installment.installmentId } },
            installmentSeq: seq,
            installmentTotalCount: installmentInput.installmentMonths,
            deletedYn: false,
            syncedAt: now,
            syncClientId: installmentInput.syncClientId ?? null,
            clientTempId: installmentInput.clientTempId ?? null
          }
        });
        transactions.push(transaction);
      }

      return { installment, transactions };
    });
  }

  findAccountsByIds(
    ids: bigint[]
  ): Promise<Pick<Account, "accountId" | "accountName" | "deletedYn">[]> {
    return this.prisma.account.findMany({
      where: { accountId: { in: ids } },
      select: { accountId: true, accountName: true, deletedYn: true }
    });
  }

  findCardsByIds(
    ids: bigint[]
  ): Promise<Pick<Card, "cardId" | "cardName" | "deletedYn" | "useYn">[]> {
    return this.prisma.card.findMany({
      where: { cardId: { in: ids } },
      select: { cardId: true, cardName: true, deletedYn: true, useYn: true }
    });
  }

  findAccount(accountId: bigint, userId: bigint): Promise<Account | null> {
    return this.prisma.account.findFirst({
      where: { accountId, userId, deletedYn: false }
    });
  }

  findOwnedAccount(accountId: bigint, userId: bigint): Promise<Account | null> {
    return this.prisma.account.findFirst({
      where: { accountId, userId }
    });
  }

  findOwnedCard(cardId: bigint, userId: bigint): Promise<Card | null> {
    return this.prisma.card.findFirst({
      where: { cardId, userId }
    });
  }

  findAccountTransactionsForBalance(
    accountId: bigint,
    userId: bigint
  ): Promise<AccountBalanceTransaction[]> {
    return this.prisma.transaction.findMany({
      where: {
        userId,
        walletType: "ACCOUNT",
        walletId: accountId,
        deletedYn: false
      },
      select: {
        transactionId: true,
        transactionType: true,
        amount: true,
        transactionDate: true
      },
      orderBy: [{ transactionDate: "asc" }, { transactionId: "asc" }]
    });
  }

  findCard(cardId: bigint, userId: bigint): Promise<Card | null> {
    return this.prisma.card.findFirst({
      where: { cardId, userId, useYn: true, deletedYn: false }
    });
  }

  findCategory(categoryId: bigint, userId: bigint): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: {
        categoryId,
        OR: [{ isDefault: true }, { userId }]
      }
    });
  }

  async sumCardExpense(
    userId: bigint,
    walletId: bigint,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    const dateFilter: Prisma.DateTimeFilter | undefined =
      startDate || endDate
        ? {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {})
          }
        : undefined;

    const result = await this.prisma.transaction.aggregate({
      where: {
        userId,
        walletType: "CARD",
        walletId,
        transactionType: "EXPENSE",
        deletedYn: false,
        ...(dateFilter ? { transactionDate: dateFilter } : {})
      },
      _sum: { amount: true }
    });

    return result._sum.amount?.toNumber() ?? 0;
  }

  create(input: CreateTransactionInput): Promise<Transaction> {
    return this.prisma.transaction.create({
      data: {
        user: { connect: { userId: input.userId } },
        category: { connect: { categoryId: input.categoryId } },
        walletId: input.walletId,
        transactionType: input.transactionType,
        walletType: input.walletType,
        amount: input.amount,
        transactionDate: input.transactionDate,
        memo: input.memo ?? null,
        ...(input.installmentId
          ? { cardInstallment: { connect: { installmentId: input.installmentId } } }
          : {}),
        installmentSeq: input.installmentSeq ?? null,
        installmentTotalCount: input.installmentTotalCount ?? null,
        deletedYn: false,
        syncedAt: input.syncedAt ?? null,
        syncClientId: input.syncClientId ?? null,
        clientTempId: input.clientTempId ?? null
      }
    });
  }

  createWithAccountBalanceUpdate(
    input: CreateTransactionInput,
    accountId: bigint,
    balanceDelta: number
  ): Promise<Transaction> {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          user: { connect: { userId: input.userId } },
          category: { connect: { categoryId: input.categoryId } },
          walletId: input.walletId,
          transactionType: input.transactionType,
          walletType: input.walletType,
          amount: input.amount,
          transactionDate: input.transactionDate,
          memo: input.memo ?? null,
          deletedYn: false,
          syncedAt: input.syncedAt ?? null,
          syncClientId: input.syncClientId ?? null,
          clientTempId: input.clientTempId ?? null
        }
      });
      if (balanceDelta < 0) {
        const updated = await tx.account.update({
          where: { accountId },
          data: { currentBalance: { increment: balanceDelta } },
          select: { currentBalance: true, allowNegativeBalance: true, negativeBalanceLimit: true }
        });
        const minimum = updated.allowNegativeBalance ? -updated.negativeBalanceLimit.toNumber() : 0;
        if (updated.currentBalance.toNumber() < minimum) {
          throw new BalanceViolationError();
        }
      } else {
        await tx.account.update({
          where: { accountId },
          data: { currentBalance: { increment: balanceDelta } }
        });
      }
      return transaction;
    });
  }

  updateWithBalances(
    transactionId: bigint,
    updateData: Prisma.TransactionUpdateInput,
    balanceChanges: Array<{ accountId: bigint; delta: number }>
  ): Promise<Transaction> {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.update({
        where: { transactionId },
        data: updateData
      });
      for (const change of balanceChanges) {
        if (change.delta < 0) {
          const updated = await tx.account.update({
            where: { accountId: change.accountId },
            data: { currentBalance: { increment: change.delta } },
            select: { currentBalance: true, allowNegativeBalance: true, negativeBalanceLimit: true }
          });
          const minimum = updated.allowNegativeBalance
            ? -updated.negativeBalanceLimit.toNumber()
            : 0;
          if (updated.currentBalance.toNumber() < minimum) {
            throw new BalanceViolationError();
          }
        } else {
          await tx.account.update({
            where: { accountId: change.accountId },
            data: { currentBalance: { increment: change.delta } }
          });
        }
      }
      return transaction;
    });
  }

  softDeleteWithBalance(
    transactionId: bigint,
    balanceChange?: { accountId: bigint; delta: number }
  ): Promise<Transaction> {
    return this.prisma.$transaction(async (tx) => {
      if (balanceChange) {
        if (balanceChange.delta < 0) {
          const updated = await tx.account.update({
            where: { accountId: balanceChange.accountId },
            data: { currentBalance: { increment: balanceChange.delta } },
            select: { currentBalance: true, allowNegativeBalance: true, negativeBalanceLimit: true }
          });
          const minimum = updated.allowNegativeBalance
            ? -updated.negativeBalanceLimit.toNumber()
            : 0;
          if (updated.currentBalance.toNumber() < minimum) {
            throw new BalanceViolationError();
          }
        } else {
          await tx.account.update({
            where: { accountId: balanceChange.accountId },
            data: { currentBalance: { increment: balanceChange.delta } }
          });
        }
      }
      return tx.transaction.update({
        where: { transactionId },
        data: { deletedYn: true }
      });
    });
  }
}
