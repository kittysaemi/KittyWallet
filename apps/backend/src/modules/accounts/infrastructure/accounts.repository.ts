import { Injectable } from "@nestjs/common";
import { Account, Icon, Prisma } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";

@Injectable()
export class AccountsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(userId: bigint, useYn?: boolean): Promise<Account[]> {
    return this.prisma.account.findMany({
      where: {
        userId,
        ...(useYn === undefined ? {} : { useYn })
      },
      orderBy: { accountId: "asc" }
    });
  }

  findById(accountId: bigint, userId: bigint): Promise<Account | null> {
    return this.prisma.account.findFirst({
      where: { accountId, userId }
    });
  }

  findDuplicateName(
    accountName: string,
    userId: bigint,
    excludeId?: bigint
  ): Promise<Account | null> {
    return this.prisma.account.findFirst({
      where: {
        accountName,
        userId,
        ...(excludeId === undefined ? {} : { accountId: { not: excludeId } })
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

  create(data: Prisma.AccountCreateInput): Promise<Account> {
    return this.prisma.account.create({ data });
  }

  update(accountId: bigint, data: Prisma.AccountUpdateInput): Promise<Account> {
    return this.prisma.account.update({
      where: { accountId },
      data
    });
  }
}
