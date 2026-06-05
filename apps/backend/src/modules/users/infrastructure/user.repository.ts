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

  withdraw(userId: bigint): Promise<User> {
    return this.prisma.user.update({
      where: { userId },
      data: {
        status: 'WITHDRAWN',
        withdrawnAt: new Date(),
      },
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
}
