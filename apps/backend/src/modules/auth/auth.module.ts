import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import { AuthController } from './presentation/auth.controller';

import { SignupUseCase } from './application/use-cases/signup.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case';
import { RequestResetPasswordUseCase } from './application/use-cases/request-reset-password.use-case';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.use-case';

import { USER_REPOSITORY } from './domain/repositories/user.repository';
import { REFRESH_TOKEN_REPOSITORY } from './domain/repositories/refresh-token.repository';

import { UserPrismaRepository } from './infrastructure/repositories/user.prisma-repository';
import { RefreshTokenPrismaRepository } from './infrastructure/repositories/refresh-token.prisma-repository';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtStrategy } from './infrastructure/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    // Use cases
    SignupUseCase,
    LoginUseCase,
    LogoutUseCase,
    RefreshTokenUseCase,
    RequestResetPasswordUseCase,
    ResetPasswordUseCase,
    // Repositories
    {
      provide: USER_REPOSITORY,
      useClass: UserPrismaRepository,
    },
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: RefreshTokenPrismaRepository,
    },
    // JWT Strategy
    JwtStrategy,
    // Global JWT Guard
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AuthModule {}
