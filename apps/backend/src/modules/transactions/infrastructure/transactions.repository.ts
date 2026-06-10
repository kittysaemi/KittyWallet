import { Injectable } from "@nestjs/common";
import {
  Account,
  Card,
  Category,
  Prisma,
  Transaction,
  TransactionType,
  WalletType
} from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";
import { BalanceViolationError } from "../domain/errors";

export type TransactionWithCategory = Transaction & { category: Category };

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
  ): Promise<TransactionWithCategory[]> {
    return this.prisma.transaction.findMany({
      where: this.buildWhere(condition),
      include: { category: true },
      orderBy,
      skip: (page - 1) * limit,
      take: limit
    });
  }

  count(condition: FindTransactionsCondition): Promise<number> {
    return this.prisma.transaction.count({ where: this.buildWhere(condition) });
  }

  findById(transactionId: bigint, userId: bigint): Promise<TransactionWithCategory | null> {
    return this.prisma.transaction.findFirst({
      where: { transactionId, userId, deletedYn: false },
      include: { category: true }
    });
  }

  findRecent(userId: bigint, limit: number): Promise<TransactionWithCategory[]> {
    return this.prisma.transaction.findMany({
      where: { userId, deletedYn: false },
      include: { category: true },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      take: limit
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
  ): Promise<Pick<Card, "cardId" | "cardName" | "deletedYn">[]> {
    return this.prisma.card.findMany({
      where: { cardId: { in: ids } },
      select: { cardId: true, cardName: true, deletedYn: true }
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
        deletedYn: false,
        syncedAt: input.syncedAt ?? null
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
          syncedAt: input.syncedAt ?? null
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
