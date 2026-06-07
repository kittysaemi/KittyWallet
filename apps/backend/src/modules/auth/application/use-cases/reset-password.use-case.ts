import { HttpStatus, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'node:crypto';
import { AppException } from '../../../../common/exceptions/app.exception';
import { AuthRepository } from '../../infrastructure/repositories/auth.repository';

interface ResetPasswordCommand {
  email: string;
  resetToken: string;
  newPassword: string;
  newPasswordConfirm: string;
}

@Injectable()
export class ResetPasswordUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(command: ResetPasswordCommand): Promise<null> {
    if (command.newPassword !== command.newPasswordConfirm) {
      throw new AppException('AUTH_005', '비밀번호 확인이 일치하지 않습니다.', HttpStatus.BAD_REQUEST);
    }

    const user = await this.authRepository.findUserByEmail(command.email);
    if (!user) {
      throw new AppException('AUTH_008', '비밀번호 재설정 대상 사용자가 없습니다.', HttpStatus.NOT_FOUND);
    }

    const hashedResetToken = this.hashResetToken(command.resetToken);
    const now = new Date();
    if (
      !user.resetToken ||
      !user.resetTokenExpiresAt ||
      user.resetToken !== hashedResetToken ||
      user.resetTokenExpiresAt <= now
    ) {
      throw new AppException(
        'AUTH_007',
        '비밀번호 재설정 토큰이 만료되었거나 유효하지 않습니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const hashedPassword = await bcrypt.hash(command.newPassword, 10);
    await this.authRepository.resetPasswordAndRevokeRefreshTokens(user.userId, hashedPassword);

    return null;
  }

  private hashResetToken(resetToken: string): string {
    return crypto.createHash('sha256').update(resetToken).digest('hex');
  }
}
