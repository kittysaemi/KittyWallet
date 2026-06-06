import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(userId: bigint): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { userId } });
  }

  updateNickname(userId: bigint, nickname: string): Promise<User> {
    return this.prisma.user.update({
      where: { userId },
      data: { nickname },
    });
  }

  countPendingSyncTransactions(userId: bigint): Promise<number> {
    return this.prisma.transaction.count({
      where: {
        userId,
        deletedYn: false,
        clientTempId: { not: null },
        syncedAt: null,
      },
    });
  }

  revokeAllRefreshTokens(userId: bigint): Promise<Prisma.BatchPayload> {
    return this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async deleteAllUserData(userId: bigint): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.syncHistory.deleteMany({ where: { userId } });
      await tx.transaction.deleteMany({ where: { userId } });
      await tx.categoryUserSetting.deleteMany({ where: { userId } });
      await tx.userSetting.deleteMany({ where: { userId } });
      await tx.account.deleteMany({ where: { userId } });
      await tx.card.deleteMany({ where: { userId } });
      await tx.category.deleteMany({ where: { userId, isDefault: false } });
      await tx.icon.deleteMany({ where: { userId, isDefault: false } });
      await tx.syncClient.deleteMany({ where: { userId } });
      await tx.refreshToken.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { userId } });
    });
  }
}
