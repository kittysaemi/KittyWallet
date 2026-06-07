import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { MailService } from '../../../../infra/mail/mail.service';
import { AuthRepository } from '../../infrastructure/repositories/auth.repository';

interface RequestResetPasswordCommand {
  email: string;
}

const RESET_TOKEN_TTL_MINUTES = 30;

@Injectable()
export class RequestResetPasswordUseCase {
  private readonly logger = new Logger(RequestResetPasswordUseCase.name);

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly mailService: MailService,
  ) {}

  async execute(command: RequestResetPasswordCommand): Promise<null> {
    const user = await this.authRepository.findUserByEmail(command.email);

    if (!user) {
      return null;
    }

    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const resetToken = this.hashResetToken(rawResetToken);
    const resetTokenExpiresAt = new Date();
    resetTokenExpiresAt.setMinutes(resetTokenExpiresAt.getMinutes() + RESET_TOKEN_TTL_MINUTES);

    await this.authRepository.updatePasswordResetToken(
      user.userId,
      resetToken,
      resetTokenExpiresAt,
    );

    try {
      await this.mailService.sendPasswordResetMail({
        to: user.email,
        resetToken: rawResetToken,
      });
    } catch (error) {
      this.logger.warn(
        `Password reset email failed for user_id=${String(user.userId)}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }

    return null;
  }

  private hashResetToken(resetToken: string): string {
    return crypto.createHash('sha256').update(resetToken).digest('hex');
  }
}
