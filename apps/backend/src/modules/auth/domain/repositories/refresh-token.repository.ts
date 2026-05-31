import { RefreshToken } from '@prisma/client';

export interface IRefreshTokenRepository {
  create(data: {
    userId: bigint;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    clientId?: string;
  }): Promise<RefreshToken>;
  findActiveByUserId(userId: bigint): Promise<RefreshToken[]>;
  revokeAllByUserId(userId: bigint): Promise<void>;
  findById(refreshTokenId: bigint): Promise<RefreshToken | null>;
  revokeById(refreshTokenId: bigint): Promise<void>;
}

export const REFRESH_TOKEN_REPOSITORY = Symbol('IRefreshTokenRepository');
