import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../../database/prisma.module';
import { JwtStrategy } from '../../infra/jwt/jwt.strategy';
import { SignupUseCase } from './application/use-cases/signup.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { AuthRepository } from './infrastructure/repositories/auth.repository';
import { AuthController } from './presentation/auth.controller';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '2h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    AuthRepository,
    SignupUseCase,
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
  ],
  exports: [JwtModule],
})
export class AuthModule {}
