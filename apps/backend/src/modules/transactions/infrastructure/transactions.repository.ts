import { Injectable } from "@nestjs/common";
import { Account, Card, Category, Transaction, TransactionType, WalletType } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";

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

@Injectable()
export class TransactionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAccount(accountId: bigint, userId: bigint): Promise<Account | null> {
    return this.prisma.account.findFirst({
      where: { accountId, userId, useYn: true }
    });
  }

  findCard(cardId: bigint, userId: bigint): Promise<Card | null> {
    return this.prisma.card.findFirst({
      where: { cardId, userId, useYn: true }
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
      await tx.account.update({
        where: { accountId },
        data: { currentBalance: { increment: balanceDelta } }
      });
      return transaction;
    });
  }
}
