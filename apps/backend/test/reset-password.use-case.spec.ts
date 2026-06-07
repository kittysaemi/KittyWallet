import * as bcrypt from 'bcryptjs';
import * as crypto from 'node:crypto';
import { ResetPasswordUseCase } from '../src/modules/auth/application/use-cases/reset-password.use-case';
import { AuthRepository } from '../src/modules/auth/infrastructure/repositories/auth.repository';

describe('ResetPasswordUseCase', () => {
  const authRepository = {
    findUserByEmail: jest.fn(),
    resetPasswordAndRevokeRefreshTokens: jest.fn(),
  } as unknown as jest.Mocked<AuthRepository>;

  const useCase = new ResetPasswordUseCase(authRepository);

  beforeEach(() => {
    jest.clearAllMocks();
    authRepository.resetPasswordAndRevokeRefreshTokens.mockResolvedValue();
  });

  it('changes password and revokes refresh tokens with a valid reset token', async () => {
    const rawResetToken = 'valid-reset-token';
    authRepository.findUserByEmail.mockResolvedValue({
      userId: BigInt(1),
      email: 'test@example.com',
      password: 'old-password',
      nickname: 'tester',
      resetToken: hashResetToken(rawResetToken),
      resetTokenExpiresAt: futureDate(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      useCase.execute({
        email: 'test@example.com',
        resetToken: rawResetToken,
        newPassword: 'newPassword123',
        newPasswordConfirm: 'newPassword123',
      }),
    ).resolves.toBeNull();

    expect(authRepository.resetPasswordAndRevokeRefreshTokens).toHaveBeenCalledTimes(1);
    const [userId, hashedPassword] = authRepository.resetPasswordAndRevokeRefreshTokens.mock.calls[0];
    expect(userId).toBe(BigInt(1));
    await expect(bcrypt.compare('newPassword123', hashedPassword)).resolves.toBe(true);
  });

  it('rejects a password confirmation mismatch with AUTH_005', async () => {
    await expect(
      useCase.execute({
        email: 'test@example.com',
        resetToken: 'token',
        newPassword: 'newPassword123',
        newPasswordConfirm: 'otherPassword123',
      }),
    ).rejects.toMatchObject({ code: 'AUTH_005' });

    expect(authRepository.findUserByEmail).not.toHaveBeenCalled();
    expect(authRepository.resetPasswordAndRevokeRefreshTokens).not.toHaveBeenCalled();
  });

  it('rejects an unknown user with AUTH_008', async () => {
    authRepository.findUserByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({
        email: 'none@example.com',
        resetToken: 'token',
        newPassword: 'newPassword123',
        newPasswordConfirm: 'newPassword123',
      }),
    ).rejects.toMatchObject({ code: 'AUTH_008' });
  });

  it('rejects a wrong reset token with AUTH_007', async () => {
    authRepository.findUserByEmail.mockResolvedValue({
      userId: BigInt(1),
      email: 'test@example.com',
      password: 'old-password',
      nickname: 'tester',
      resetToken: hashResetToken('valid-reset-token'),
      resetTokenExpiresAt: futureDate(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      useCase.execute({
        email: 'test@example.com',
        resetToken: 'wrong-reset-token',
        newPassword: 'newPassword123',
        newPasswordConfirm: 'newPassword123',
      }),
    ).rejects.toMatchObject({ code: 'AUTH_007' });
  });

  it('rejects an expired reset token with AUTH_007', async () => {
    const rawResetToken = 'valid-reset-token';
    authRepository.findUserByEmail.mockResolvedValue({
      userId: BigInt(1),
      email: 'test@example.com',
      password: 'old-password',
      nickname: 'tester',
      resetToken: hashResetToken(rawResetToken),
      resetTokenExpiresAt: pastDate(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      useCase.execute({
        email: 'test@example.com',
        resetToken: rawResetToken,
        newPassword: 'newPassword123',
        newPasswordConfirm: 'newPassword123',
      }),
    ).rejects.toMatchObject({ code: 'AUTH_007' });
  });
});

function hashResetToken(resetToken: string): string {
  return crypto.createHash('sha256').update(resetToken).digest('hex');
}

function futureDate(): Date {
  return new Date(Date.now() + 30 * 60 * 1000);
}

function pastDate(): Date {
  return new Date(Date.now() - 60 * 1000);
}
