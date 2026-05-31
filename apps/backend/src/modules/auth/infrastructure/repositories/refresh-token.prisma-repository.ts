import { Injectable } from '@nestjs/common';
import { RefreshToken } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';
import { IRefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';

@Injectable()
export class RefreshTokenPrismaRepository implements IRefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: bigint;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    clientId?: string;
  }): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({
      data: {
        user_id: data.userId,
        token_hash: data.tokenHash,
        expires_at: data.expiresAt,
        user_agent: data.userAgent ?? null,
        client_id: data.clientId ?? null,
      },
    });
  }

  async findActiveByUserId(userId: bigint): Promise<RefreshToken[]> {
    return this.prisma.refreshToken.findMany({
      where: {
        user_id: userId,
        revoked_at: null,
        expires_at: { gt: new Date() },
      },
    });
  }

  async revokeAllByUserId(userId: bigint): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { user_id: userId, revoked_at: null },
      data: { revoked_at: new Date() },
    });
  }

  async findById(refreshTokenId: bigint): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({
      where: { refresh_token_id: refreshTokenId },
    });
  }

  async revokeById(refreshTokenId: bigint): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { refresh_token_id: refreshTokenId },
      data: { revoked_at: new Date() },
    });
  }
}
