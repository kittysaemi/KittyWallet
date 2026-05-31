import { User } from '@prisma/client';

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(userId: bigint): Promise<User | null>;
  create(data: {
    email: string;
    password: string;
    nickname: string;
  }): Promise<User>;
  updatePassword(userId: bigint, hashedPassword: string): Promise<User>;
  updateResetToken(
    userId: bigint,
    resetTokenHash: string | null,
    resetTokenExpiresAt: Date | null,
  ): Promise<User>;
}

export const USER_REPOSITORY = Symbol('IUserRepository');
