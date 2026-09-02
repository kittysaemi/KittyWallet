import { Injectable } from "@nestjs/common";
import { Account, Category, Prisma, Transaction } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";

const TRANSFER_CATEGORY_NAME = "계좌금액이동";
const TRANSFER_CATEGORY_ICON_PROVIDER_KEY = "repeat";

export type PrismaClientOrTx = PrismaService | Prisma.TransactionClient;

export type AccountBalanceLedgerRow = Pick<
  Transaction,
  "transactionId" | "transactionType" | "amount" | "transactionDate"
>;

export interface CreateTransferPairInput {
  userId: bigint;
  categoryId: bigint;
  fromAccountId: bigint;
  toAccountId: bigint;
  amount: number;
  transactionDate: Date;
  memo?: string | null;
  transferGroupId: string;
  now: Date;
}

export interface UpdateTransferPairInput {
  fromTransactionId: bigint;
  toTransactionId: bigint;
  fromAccountId: bigint;
  toAccountId: bigint;
  amount: number;
  transactionDate: Date;
  memo?: string | null;
  hasMemoUpdate: boolean;
}

export interface BalanceChange {
  accountId: bigint;
  delta: number;
}

@Injectable()
export class TransferRepository {
  constructor(private readonly prisma: PrismaService) {}

  runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  private sortedUniqueIds(ids: bigint[]): bigint[] {
    return Array.from(new Set(ids.map((id) => id.toString())))
      .map((id) => BigInt(id))
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  }

  /** 동시 요청으로 인한 잔액 정합성 문제를 막기 위해 관련 계좌 row를 잠근다(데드락 방지를 위해 id 오름차순으로 잠금). */
  async lockAccounts(tx: Prisma.TransactionClient, accountIds: bigint[]): Promise<void> {
    const sortedIds = this.sortedUniqueIds(accountIds);
    if (sortedIds.length === 0) return;
    await tx.$queryRaw`SELECT account_id FROM "ACCOUNT" WHERE account_id IN (${Prisma.join(sortedIds)}) FOR UPDATE`;
  }

  /** 짝 거래 2건을 동시 수정/삭제 요청으로부터 보호하기 위해 잠근다. */
  async lockTransactions(tx: Prisma.TransactionClient, transactionIds: bigint[]): Promise<void> {
    const sortedIds = this.sortedUniqueIds(transactionIds);
    if (sortedIds.length === 0) return;
    await tx.$queryRaw`SELECT transaction_id FROM "TRANSACTION" WHERE transaction_id IN (${Prisma.join(sortedIds)}) FOR UPDATE`;
  }

  findAccountsByIds(client: PrismaClientOrTx, accountIds: bigint[], userId: bigint): Promise<Account[]> {
    if (accountIds.length === 0) return Promise.resolve([]);
    return client.account.findMany({
      where: { accountId: { in: accountIds }, userId }
    });
  }

  findAccountLedger(
    client: PrismaClientOrTx,
    accountId: bigint,
    userId: bigint
  ): Promise<AccountBalanceLedgerRow[]> {
    return client.transaction.findMany({
      where: { userId, walletType: "ACCOUNT", walletId: accountId, deletedYn: false },
      select: { transactionId: true, transactionType: true, amount: true, transactionDate: true }
    });
  }

  findTransferPair(
    client: PrismaClientOrTx,
    userId: bigint,
    transferGroupId: string
  ): Promise<Transaction[]> {
    return client.transaction.findMany({
      where: { userId, transferGroupId, deletedYn: false },
      orderBy: { transactionId: "asc" }
    });
  }

  findTransferPairReadOnly(userId: bigint, transferGroupId: string): Promise<Transaction[]> {
    return this.findTransferPair(this.prisma, userId, transferGroupId);
  }

  async findOrCreateTransferCategory(tx: Prisma.TransactionClient, userId: bigint): Promise<Category> {
    const ownCategory = await tx.category.findFirst({
      where: { userId, categoryName: TRANSFER_CATEGORY_NAME }
    });
    if (ownCategory) return ownCategory;

    const defaultCategory = await tx.category.findFirst({
      where: { isDefault: true, categoryName: TRANSFER_CATEGORY_NAME }
    });
    if (defaultCategory) return defaultCategory;

    const fallbackIcon =
      (await tx.icon.findFirst({
        where: { isDefault: true, iconDictionary: { providerKey: TRANSFER_CATEGORY_ICON_PROVIDER_KEY } }
      })) ?? (await tx.icon.findFirst({ where: { isDefault: true }, orderBy: { iconId: "asc" } }));

    if (!fallbackIcon) {
      throw new Error("계좌이동 카테고리를 생성할 기본 아이콘을 찾을 수 없습니다.");
    }

    try {
      return await tx.category.create({
        data: {
          user: { connect: { userId } },
          icon: { connect: { iconId: fallbackIcon.iconId } },
          categoryName: TRANSFER_CATEGORY_NAME,
          isDefault: false,
          show: true
        }
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const racedCategory = await tx.category.findFirst({
          where: { userId, categoryName: TRANSFER_CATEGORY_NAME }
        });
        if (racedCategory) return racedCategory;
      }
      throw err;
    }
  }

  async createTransferPair(
    tx: Prisma.TransactionClient,
    input: CreateTransferPairInput
  ): Promise<{ fromTransaction: Transaction; toTransaction: Transaction }> {
    const fromTransaction = await tx.transaction.create({
      data: {
        user: { connect: { userId: input.userId } },
        category: { connect: { categoryId: input.categoryId } },
        walletId: input.fromAccountId,
        walletType: "ACCOUNT",
        transactionType: "EXPENSE",
        amount: input.amount,
        transactionDate: input.transactionDate,
        memo: input.memo ?? null,
        transferGroupId: input.transferGroupId,
        deletedYn: false,
        syncedAt: input.now
      }
    });

    const toTransaction = await tx.transaction.create({
      data: {
        user: { connect: { userId: input.userId } },
        category: { connect: { categoryId: input.categoryId } },
        walletId: input.toAccountId,
        walletType: "ACCOUNT",
        transactionType: "INCOME",
        amount: input.amount,
        transactionDate: input.transactionDate,
        memo: input.memo ?? null,
        transferGroupId: input.transferGroupId,
        deletedYn: false,
        syncedAt: input.now
      }
    });

    await tx.account.update({
      where: { accountId: input.fromAccountId },
      data: { currentBalance: { decrement: input.amount } }
    });
    await tx.account.update({
      where: { accountId: input.toAccountId },
      data: { currentBalance: { increment: input.amount } }
    });

    return { fromTransaction, toTransaction };
  }

  async updateTransferPair(
    tx: Prisma.TransactionClient,
    input: UpdateTransferPairInput,
    balanceChanges: BalanceChange[]
  ): Promise<{ fromTransaction: Transaction; toTransaction: Transaction }> {
    const fromTransaction = await tx.transaction.update({
      where: { transactionId: input.fromTransactionId },
      data: {
        walletId: input.fromAccountId,
        amount: input.amount,
        transactionDate: input.transactionDate,
        ...(input.hasMemoUpdate ? { memo: input.memo ?? null } : {})
      }
    });

    const toTransaction = await tx.transaction.update({
      where: { transactionId: input.toTransactionId },
      data: {
        walletId: input.toAccountId,
        amount: input.amount,
        transactionDate: input.transactionDate,
        ...(input.hasMemoUpdate ? { memo: input.memo ?? null } : {})
      }
    });

    for (const change of balanceChanges) {
      await tx.account.update({
        where: { accountId: change.accountId },
        data: { currentBalance: { increment: change.delta } }
      });
    }

    return { fromTransaction, toTransaction };
  }

  async deleteTransferPair(
    tx: Prisma.TransactionClient,
    fromTransactionId: bigint,
    toTransactionId: bigint,
    balanceChanges: BalanceChange[]
  ): Promise<void> {
    await tx.transaction.update({
      where: { transactionId: fromTransactionId },
      data: { deletedYn: true }
    });
    await tx.transaction.update({
      where: { transactionId: toTransactionId },
      data: { deletedYn: true }
    });

    for (const change of balanceChanges) {
      await tx.account.update({
        where: { accountId: change.accountId },
        data: { currentBalance: { increment: change.delta } }
      });
    }
  }
}
