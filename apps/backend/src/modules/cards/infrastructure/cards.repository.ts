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
}
