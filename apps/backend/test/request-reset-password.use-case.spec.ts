import { Logger } from '@nestjs/common';
import { MailService } from '../src/infra/mail/mail.service';
import { RequestResetPasswordUseCase } from '../src/modules/auth/application/use-cases/request-reset-password.use-case';
import { AuthRepository } from '../src/modules/auth/infrastructure/repositories/auth.repository';

describe('RequestResetPasswordUseCase', () => {
  let warnSpy: jest.SpyInstance;

  const authRepository = {
    findUserByEmail: jest.fn(),
    updatePasswordResetToken: jest.fn(),
  } as unknown as jest.Mocked<AuthRepository>;

  const mailService = {
    sendPasswordResetMail: jest.fn(),
  } as unknown as jest.Mocked<MailService>;

  const useCase = new RequestResetPasswordUseCase(authRepository, mailService);

  beforeAll(() => {
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterAll(() => {
    warnSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    authRepository.updatePasswordResetToken.mockResolvedValue({
      userId: BigInt(1),
      email: 'test@example.com',
      password: 'hashed-password',
      nickname: 'tester',
      resetToken: 'hashed-reset-token',
      resetTokenExpiresAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('stores reset token and sends email for an existing user', async () => {
    authRepository.findUserByEmail.mockResolvedValue({
      userId: BigInt(1),
      email: 'test@example.com',
      password: 'hashed-password',
      nickname: 'tester',
      resetToken: null,
      resetTokenExpiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(useCase.execute({ email: 'test@example.com' })).resolves.toBeNull();

    expect(authRepository.updatePasswordResetToken).toHaveBeenCalledTimes(1);
    const [, resetToken, resetTokenExpiresAt] = authRepository.updatePasswordResetToken.mock.calls[0];
    expect(resetToken).toMatch(/^[a-f0-9]{64}$/);
    expect(resetTokenExpiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(mailService.sendPasswordResetMail).toHaveBeenCalledWith({
      to: 'test@example.com',
      resetToken: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
  });

  it('returns the same success result for an unknown user without sending email', async () => {
    authRepository.findUserByEmail.mockResolvedValue(null);

    await expect(useCase.execute({ email: 'none@example.com' })).resolves.toBeNull();

    expect(authRepository.updatePasswordResetToken).not.toHaveBeenCalled();
    expect(mailService.sendPasswordResetMail).not.toHaveBeenCalled();
  });

  it('keeps the same success result when email sending fails', async () => {
    authRepository.findUserByEmail.mockResolvedValue({
      userId: BigInt(1),
      email: 'test@example.com',
      password: 'hashed-password',
      nickname: 'tester',
      resetToken: null,
      resetTokenExpiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mailService.sendPasswordResetMail.mockRejectedValue(new Error('SMTP failed'));

    await expect(useCase.execute({ email: 'test@example.com' })).resolves.toBeNull();

    expect(authRepository.updatePasswordResetToken).toHaveBeenCalledTimes(1);
    expect(mailService.sendPasswordResetMail).toHaveBeenCalledTimes(1);
  });
});
