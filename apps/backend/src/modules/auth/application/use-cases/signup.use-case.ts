import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SignupCommand } from '../dto/command/signup.command';
import { SignupResult } from '../dto/result/signup.result';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user.repository';
import { BusinessException } from '../../../../common/exceptions/business.exception';

@Injectable()
export class SignupUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(command: SignupCommand): Promise<SignupResult> {
    const existingUser = await this.userRepository.findByEmail(command.email);
    if (existingUser) {
      throw new BusinessException('AUTH_001');
    }

    const hashedPassword = await bcrypt.hash(command.password, 10);

    const user = await this.userRepository.create({
      email: command.email,
      password: hashedPassword,
      nickname: command.nickname,
    });

    return new SignupResult(
      Number(user.user_id),
      user.email,
      user.nickname,
    );
  }
}
