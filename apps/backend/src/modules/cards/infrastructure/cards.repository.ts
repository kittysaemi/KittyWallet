import { Injectable } from "@nestjs/common";
import { Card, Icon, Prisma } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";

@Injectable()
export class CardsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(userId: bigint, useYn?: boolean): Promise<Card[]> {
    return this.prisma.card.findMany({
      where: {
        userId,
        deletedYn: false,
        ...(useYn === undefined ? {} : { useYn })
      },
      orderBy: { cardId: "asc" }
    });
  }

  findById(cardId: bigint, userId: bigint): Promise<Card | null> {
    return this.prisma.card.findFirst({
      where: { cardId, userId }
    });
  }

  findDuplicateName(
    cardName: string,
    userId: bigint,
    excludeId?: bigint
  ): Promise<Card | null> {
    return this.prisma.card.findFirst({
      where: {
        cardName,
        userId,
        deletedYn: false,
        ...(excludeId === undefined ? {} : { cardId: { not: excludeId } })
      }
    });
  }

  findAvailableIcon(iconId: bigint, userId: bigint): Promise<Icon | null> {
    return this.prisma.icon.findFirst({
      where: {
        iconId,
        show: true,
        OR: [{ isDefault: true }, { userId }]
      }
    });
  }

  create(data: Prisma.CardCreateInput): Promise<Card> {
    return this.prisma.card.create({ data });
  }

  update(cardId: bigint, data: Prisma.CardUpdateInput): Promise<Card> {
    return this.prisma.card.update({
      where: { cardId },
      data
    });
  }

  async archive(
    cardId: bigint,
    userId: bigint,
    deleteTransactions: boolean,
    prismaClient?: Prisma.TransactionClient
  ): Promise<void> {
    const tx = prismaClient ?? this.prisma;
    if (deleteTransactions) {
      await (tx as typeof this.prisma).transaction.updateMany({
        where: { walletId: cardId, walletType: "CARD", userId, deletedYn: false },
        data: { deletedYn: true }
      });
    }
    await (tx as typeof this.prisma).card.updateMany({
      where: { cardId, userId },
      data: { deletedYn: true }
    });
  }
}
