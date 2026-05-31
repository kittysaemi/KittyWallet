import { Injectable } from '@nestjs/common';
import { AuthRepository } from '../../infrastructure/repositories/auth.repository';

@Injectable()
export class LogoutUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(userId: bigint): Promise<void> {
    await this.authRepository.revokeAllUserRefreshTokens(userId);
  }
}
