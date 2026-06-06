import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'node:crypto';
import { AppException } from '../../../../common/exceptions/app.exception';
import { AuthRepository } from '../../infrastructure/repositories/auth.repository';

interface RefreshTokenCommand {
  rawRefreshToken: string;
  userAgent?: string;
}

interface RefreshTokenResult {
  accessToken: string;
  refreshToken: string;
}

const ACCESS_TOKEN_TTL = '2h';
const REFRESH_TOKEN_TTL_DAYS = 30;

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: RefreshTokenCommand): Promise<RefreshTokenResult> {
    // Refresh Token(JWT)에서 userId 추출 (만료 여부 무관하게 decode)
    let userId: bigint;
    try {
      const decoded = this.jwtService.decode(command.rawRefreshToken) as { sub?: string } | null;
      if (!decoded?.sub) throw new Error();
      userId = BigInt(decoded.sub);
    } catch {
      throw new AppException('AUTH_004', 'Refresh Token이 유효하지 않습니다.', HttpStatus.UNAUTHORIZED);
    }

    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new AppException('AUTH_004', '유효하지 않은 토큰입니다.', HttpStatus.UNAUTHORIZED);
    }

    // 활성 토큰 중 hash 일치 항목 찾기
    const candidates = await this.authRepository.findActiveRefreshTokensByUser(userId);
    let matched = null;
    for (const token of candidates) {
      const isMatch = await bcrypt.compare(command.rawRefreshToken, token.tokenHash);
      if (isMatch) {
        matched = token;
        break;
      }
    }

    if (!matched) {
      throw new AppException('AUTH_004', 'Refresh Token이 만료되었거나 유효하지 않습니다.', HttpStatus.UNAUTHORIZED);
    }

    // Rotation: 기존 토큰 폐기
    await this.authRepository.revokeRefreshToken(matched.refreshTokenId);

    // 새 Access Token 발급
    const accessToken = this.jwtService.sign(
      { sub: String(user.userId), email: user.email },
      { expiresIn: ACCESS_TOKEN_TTL },
    );

    // 새 Refresh Token 발급 (JWT 형태)
    const jti = crypto.randomBytes(20).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

    const rawRefreshToken = this.jwtService.sign(
      { sub: String(user.userId), jti },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') ?? this.configService.get<string>('JWT_SECRET'),
        expiresIn: `${REFRESH_TOKEN_TTL_DAYS}d`,
      },
    );
    const tokenHash = await bcrypt.hash(rawRefreshToken, 10);

    await this.authRepository.createRefreshToken({
      user: { connect: { userId: user.userId } },
      tokenHash,
      userAgent: command.userAgent ?? null,
      expiresAt,
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }
}
