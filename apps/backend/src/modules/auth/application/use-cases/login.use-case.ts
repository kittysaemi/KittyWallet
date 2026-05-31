import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'node:crypto';
import { AppException } from '../../../../common/exceptions/app.exception';
import { AuthRepository } from '../../infrastructure/repositories/auth.repository';

interface LoginCommand {
  email: string;
  password: string;
  userAgent?: string;
}

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: { userId: number; nickname: string };
}

const ACCESS_TOKEN_TTL = '2h';
const REFRESH_TOKEN_TTL_DAYS = 30;

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const user = await this.authRepository.findUserByEmail(command.email);

    if (!user) {
      throw new AppException('AUTH_002', '이메일 또는 비밀번호가 올바르지 않습니다.', HttpStatus.UNAUTHORIZED);
    }

    if (user.status !== 'ACTIVE') {
      throw new AppException('AUTH_003', '비활성 계정입니다.', HttpStatus.UNAUTHORIZED);
    }

    const passwordMatch = await bcrypt.compare(command.password, user.password);
    if (!passwordMatch) {
      throw new AppException('AUTH_002', '이메일 또는 비밀번호가 올바르지 않습니다.', HttpStatus.UNAUTHORIZED);
    }

    const accessToken = this.jwtService.sign(
      { sub: String(user.userId), email: user.email },
      { expiresIn: ACCESS_TOKEN_TTL },
    );

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

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: { userId: Number(user.userId), nickname: user.nickname },
    };
  }
}
