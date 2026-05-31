import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { RefreshTokenCommand } from '../dto/command/refresh-token.command';
import { RefreshTokenResult } from '../dto/result/refresh-token.result';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user.repository';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../domain/repositories/refresh-token.repository';
import { BusinessException } from '../../../../common/exceptions/business.exception';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: RefreshTokenCommand): Promise<RefreshTokenResult> {
    let payload: { sub: number; email: string };

    try {
      payload = this.jwtService.verify<{ sub: number; email: string }>(
        command.refreshToken,
        {
          secret: this.configService.get<string>('jwt.refreshSecret'),
        },
      );
    } catch {
      throw new BusinessException('AUTH_004');
    }

    const userId = BigInt(payload.sub);
    const user = await this.userRepository.findById(userId);
    if (!user || user.status !== 'ACTIVE') {
      throw new BusinessException('AUTH_004');
    }

    const activeTokens = await this.refreshTokenRepository.findActiveByUserId(userId);
    let matchedTokenId: bigint | null = null;

    for (const token of activeTokens) {
      const isMatch = await bcrypt.compare(command.refreshToken, token.token_hash);
      if (isMatch) {
        matchedTokenId = token.refresh_token_id;
        break;
      }
    }

    if (!matchedTokenId) {
      throw new BusinessException('AUTH_004');
    }

    await this.refreshTokenRepository.revokeById(matchedTokenId);

    const newPayload = { sub: Number(user.user_id), email: user.email };

    const accessToken = this.jwtService.sign(newPayload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(newPayload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: '30d',
    });

    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.refreshTokenRepository.create({
      userId: user.user_id,
      tokenHash,
      expiresAt,
      userAgent: command.userAgent,
    });

    return new RefreshTokenResult(accessToken, refreshToken);
  }
}
