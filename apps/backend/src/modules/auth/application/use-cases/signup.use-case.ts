import { HttpStatus, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AppException } from '../../../../common/exceptions/app.exception';
import { AuthRepository } from '../../infrastructure/repositories/auth.repository';

interface SignupCommand {
  email: string;
  password: string;
  passwordConfirm: string;
  nickname: string;
}

export interface SignupResult {
  userId: number;
}

@Injectable()
export class SignupUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(command: SignupCommand): Promise<SignupResult> {
    if (command.password !== command.passwordConfirm) {
      throw new AppException('AUTH_005', '비밀번호 확인이 일치하지 않습니다.', HttpStatus.BAD_REQUEST);
    }

    const existing = await this.authRepository.findUserByEmail(command.email);
    if (existing) {
      throw new AppException('AUTH_001', '이미 가입된 이메일입니다.', HttpStatus.CONFLICT);
    }

    const hashedPassword = await bcrypt.hash(command.password, 10);
    const user = await this.authRepository.createUser({
      email: command.email,
      password: hashedPassword,
      nickname: command.nickname,
    });

    return { userId: Number(user.userId) };
  }
}
