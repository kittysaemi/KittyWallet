import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ResetPasswordCommand } from '../dto/command/reset-password.command';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user.repository';
import { BusinessException } from '../../../../common/exceptions/business.exception';
import { PrismaService } from '../../../../database/prisma.service';

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: ResetPasswordCommand): Promise<void> {
    if (command.newPassword !== command.confirmPassword) {
      throw new BusinessException('AUTH_005');
    }

    // Find user with a reset token that hasn't expired
    const user = await this.prisma.user.findFirst({
      where: {
        reset_token: { not: null },
        reset_token_expires_at: { gt: new Date() },
      },
    });

    if (!user || !user.reset_token) {
      throw new BusinessException('AUTH_007');
    }

    const isTokenValid = await bcrypt.compare(command.resetToken, user.reset_token);
    if (!isTokenValid) {
      throw new BusinessException('AUTH_007');
    }

    const hashedPassword = await bcrypt.hash(command.newPassword, 10);

    await this.userRepository.updatePassword(user.user_id, hashedPassword);
    await this.userRepository.updateResetToken(user.user_id, null, null);
  }
}
