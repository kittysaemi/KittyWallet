import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '../../../../common/exceptions/app.exception';
import { UserRepository } from '../../infrastructure/user.repository';

@Injectable()
export class UpdateProfileUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(userId: bigint, nickname: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppException('USER_001', '사용자를 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    }

    const updated = await this.userRepository.updateNickname(userId, nickname).catch(() => {
      throw new AppException('USER_002', '사용자 정보 수정에 실패했습니다.', HttpStatus.INTERNAL_SERVER_ERROR);
    });

    return {
      user_id: Number(updated.userId),
      nickname: updated.nickname,
      updated_at: updated.updatedAt.toISOString(),
    };
  }
}
