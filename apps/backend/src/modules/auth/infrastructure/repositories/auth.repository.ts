import { Injectable } from '@nestjs/common';
import { Prisma, User, RefreshToken } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findUserById(userId: bigint): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { userId } });
  }

  createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  createRefreshToken(data: Prisma.RefreshTokenCreateInput): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({ data });
  }

  findActiveRefreshTokensByUser(userId: bigint): Promise<RefreshToken[]> {
    return this.prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  revokeRefreshToken(refreshTokenId: bigint): Promise<RefreshToken> {
    return this.prisma.refreshToken.update({
      where: { refreshTokenId },
      data: { revokedAt: new Date() },
    });
  }

  revokeAllUserRefreshTokens(userId: bigint): Promise<Prisma.BatchPayload> {
    return this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
