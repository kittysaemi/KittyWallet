import { Inject, Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { RequestResetPasswordCommand } from '../dto/command/request-reset-password.command';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user.repository';
import { BusinessException } from '../../../../common/exceptions/business.exception';

@Injectable()
export class RequestResetPasswordUseCase {
  private readonly logger = new Logger(RequestResetPasswordUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(command: RequestResetPasswordCommand): Promise<void> {
    const user = await this.userRepository.findByEmail(command.email);
    if (!user) {
      throw new BusinessException('AUTH_008');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = await bcrypt.hash(resetToken, 10);
    const resetTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await this.userRepository.updateResetToken(
      user.user_id,
      resetTokenHash,
      resetTokenExpiresAt,
    );

    // Development: log the reset token (do not log in production)
    this.logger.log(`[DEV] Password reset token for ${command.email}: ${resetToken}`);
  }
}
