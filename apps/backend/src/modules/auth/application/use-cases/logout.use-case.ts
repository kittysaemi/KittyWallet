import { Inject, Injectable } from '@nestjs/common';
import { LogoutCommand } from '../dto/command/logout.command';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../domain/repositories/refresh-token.repository';
import { BusinessException } from '../../../../common/exceptions/business.exception';

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    try {
      await this.refreshTokenRepository.revokeAllByUserId(command.userId);
    } catch {
      throw new BusinessException('AUTH_006');
    }
  }
}
