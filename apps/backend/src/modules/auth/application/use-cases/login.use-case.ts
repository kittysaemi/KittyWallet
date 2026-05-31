import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { LoginCommand } from '../dto/command/login.command';
import { LoginResult } from '../dto/result/login.result';
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
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const user = await this.userRepository.findByEmail(command.email);
    if (!user) {
      throw new BusinessException('AUTH_002');
    }

    const isPasswordValid = await bcrypt.compare(command.password, user.password);
    if (!isPasswordValid) {
      throw new BusinessException('AUTH_002');
    }

    if (user.status !== 'ACTIVE') {
      throw new BusinessException('AUTH_003');
    }

    const payload = { sub: Number(user.user_id), email: user.email };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
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

    return new LoginResult(
      accessToken,
      refreshToken,
      Number(user.user_id),
      user.email,
      user.nickname,
    );
  }
}
