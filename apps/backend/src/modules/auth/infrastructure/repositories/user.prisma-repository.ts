import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';
import { IUserRepository } from '../../domain/repositories/user.repository';

@Injectable()
export class UserPrismaRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(userId: bigint): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { user_id: userId } });
  }

  async create(data: {
    email: string;
    password: string;
    nickname: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        nickname: data.nickname,
      },
    });
  }

  async updatePassword(userId: bigint, hashedPassword: string): Promise<User> {
    return this.prisma.user.update({
      where: { user_id: userId },
      data: { password: hashedPassword },
    });
  }

  async updateResetToken(
    userId: bigint,
    resetTokenHash: string | null,
    resetTokenExpiresAt: Date | null,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { user_id: userId },
      data: {
        reset_token: resetTokenHash,
        reset_token_expires_at: resetTokenExpiresAt,
      },
    });
  }
}
