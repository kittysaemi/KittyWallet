import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { UserRepository } from './infrastructure/user.repository';
import { GetCurrentUserUseCase } from './application/use-cases/get-current-user.use-case';
import { UpdateProfileUseCase } from './application/use-cases/update-profile.use-case';
import { WithdrawUserUseCase } from './application/use-cases/withdraw-user.use-case';
import { UsersController } from './presentation/users.controller';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UserRepository, GetCurrentUserUseCase, UpdateProfileUseCase, WithdrawUserUseCase],
})
export class UsersModule {}
