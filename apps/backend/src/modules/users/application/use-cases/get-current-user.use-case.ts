import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '../../../../common/exceptions/app.exception';
import { UserRepository } from '../../infrastructure/user.repository';

@Injectable()
export class GetCurrentUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(userId: bigint) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppException('USER_001', '사용자를 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    }

    return {
      user_id: Number(user.userId),
      email: user.email,
      nickname: user.nickname,
      created_at: user.createdAt.toISOString(),
      updated_at: user.updatedAt.toISOString(),
    };
  }
}
