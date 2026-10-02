import { Injectable } from "@nestjs/common";
import { Account, Card, Category, FavoriteTransaction, Prisma } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";

export type FavoriteTransactionWithCategory = FavoriteTransaction & {
  category: Category & { categoryUserSettings: { show: boolean }[] };
};

@Injectable()
export class FavoriteTransactionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(userId: bigint): Promise<FavoriteTransactionWithCategory[]> {
    return this.prisma.favoriteTransaction.findMany({
      where: { userId, deletedYn: false },
      include: {
        category: {
          include: { categoryUserSettings: { where: { userId }, select: { show: true } } }
        }
      },
      orderBy: [{ createdAt: "desc" }, { favoriteTransactionId: "desc" }]
    });
  }

  findById(favoriteTransactionId: bigint, userId: bigint): Promise<FavoriteTransaction | null> {
    return this.prisma.favoriteTransaction.findFirst({
      where: { favoriteTransactionId, userId, deletedYn: false }
    });
  }

  // 지갑 상태 표시를 위해 삭제(아카이브)된 계좌·카드도 함께 조회한다.
  findAccountsByIds(userId: bigint, ids: bigint[]): Promise<Account[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.prisma.account.findMany({ where: { userId, accountId: { in: ids } } });
  }

  findCardsByIds(userId: bigint, ids: bigint[]): Promise<Card[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.prisma.card.findMany({ where: { userId, cardId: { in: ids } } });
  }

  // 아래 세 조회는 거래 등록 API(TransactionsRepository)의 지갑·카테고리 검증 기준과 같다.
  findActiveAccount(accountId: bigint, userId: bigint): Promise<Account | null> {
    return this.prisma.account.findFirst({ where: { accountId, userId, deletedYn: false } });
  }

  findActiveCard(cardId: bigint, userId: bigint): Promise<Card | null> {
    return this.prisma.card.findFirst({
      where: { cardId, userId, useYn: true, deletedYn: false }
    });
  }

  findCategory(categoryId: bigint, userId: bigint): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: { categoryId, OR: [{ isDefault: true }, { userId }] }
    });
  }

  create(data: Prisma.FavoriteTransactionUncheckedCreateInput): Promise<FavoriteTransaction> {
    return this.prisma.favoriteTransaction.create({ data });
  }

  update(
    favoriteTransactionId: bigint,
    data: Prisma.FavoriteTransactionUncheckedUpdateInput
  ): Promise<FavoriteTransaction> {
    return this.prisma.favoriteTransaction.update({ where: { favoriteTransactionId }, data });
  }
}
