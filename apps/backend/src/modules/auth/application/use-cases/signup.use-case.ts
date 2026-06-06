import { HttpStatus, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AppException } from '../../../../common/exceptions/app.exception';
import { PrismaService } from '../../../../database/prisma.service';
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

const DEFAULT_ACCOUNT_NAME = '기본 계좌';
const DEFAULT_ACCOUNT_ICON_KEY = 'wallet';

@Injectable()
export class SignupUseCase {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: SignupCommand): Promise<SignupResult> {
    if (command.password !== command.passwordConfirm) {
      throw new AppException('AUTH_005', '비밀번호 확인이 일치하지 않습니다.', HttpStatus.BAD_REQUEST);
    }

    const existing = await this.authRepository.findUserByEmail(command.email);
    if (existing) {
      throw new AppException('AUTH_001', '이미 가입된 이메일입니다.', HttpStatus.CONFLICT);
    }

    const hashedPassword = await bcrypt.hash(command.password, 10);

    const walletIcon = await this.prisma.icon.findFirst({
      where: {
        isDefault: true,
        show: true,
        iconDictionary: { providerKey: DEFAULT_ACCOUNT_ICON_KEY },
      },
    });

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: command.email,
          password: hashedPassword,
          nickname: command.nickname,
        },
      });

      if (walletIcon) {
        await tx.account.create({
          data: {
            user: { connect: { userId: newUser.userId } },
            icon: { connect: { iconId: walletIcon.iconId } },
            accountName: DEFAULT_ACCOUNT_NAME,
            initialBalance: 0,
            currentBalance: 0,
            useYn: true,
          },
        });
      }

      return newUser;
    });

    return { userId: Number(user.userId) };
  }
}
