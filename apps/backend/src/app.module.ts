import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './config/app.config';
import { jwtConfig } from './config/jwt.config';
import { validateEnv } from './config/validation';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, jwtConfig],
      validate: validateEnv,
    }),
    PrismaModule,
    AuthModule,
  ],
})
export class AppModule {}
