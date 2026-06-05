import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '../../../../common/exceptions/app.exception';
import { UserRepository } from '../../infrastructure/user.repository';

const WITHDRAW_CONFIRM_TEXT = '탈퇴';

@Injectable()
export class WithdrawUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(userId: bigint, confirmText: string) {
    if (confirmText !== WITHDRAW_CONFIRM_TEXT) {
      throw new AppException('VALIDATION_001', '확인 문구가 올바르지 않습니다.', HttpStatus.BAD_REQUEST);
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppException('USER_001', '사용자를 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    }

    const pendingCount = await this.userRepository.countPendingSyncTransactions(userId);
    if (pendingCount > 0) {
      throw new AppException('USER_003', '미동기화 데이터가 있습니다. 동기화 완료 후 다시 시도해주세요.', HttpStatus.CONFLICT);
    }

    await this.userRepository.revokeAllRefreshTokens(userId);
    const withdrawn = await this.userRepository.withdraw(userId);

    return {
      withdrawn: true,
      withdrawn_at: withdrawn.withdrawnAt!.toISOString(),
    };
  }
}
