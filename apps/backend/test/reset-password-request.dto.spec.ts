import { validate } from 'class-validator';
import { ResetPasswordRequestDto } from '../src/modules/auth/presentation/dto/request/reset-password-request.dto';

describe('ResetPasswordRequestDto', () => {
  it('accepts a valid reset password request', async () => {
    const dto = createDto({
      email: 'test@example.com',
      reset_token: 'reset-token',
      new_password: 'newPassword123',
      new_password_confirm: 'newPassword123',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects invalid email, empty token, and short password', async () => {
    const dto = createDto({
      email: 'not-email',
      reset_token: '',
      new_password: 'short',
      new_password_confirm: 'short',
    });

    const errors = await validate(dto);
    const properties = errors.map((error) => error.property);

    expect(properties).toEqual(
      expect.arrayContaining(['email', 'reset_token', 'new_password', 'new_password_confirm']),
    );
  });
});

function createDto(data: Partial<ResetPasswordRequestDto>): ResetPasswordRequestDto {
  const dto = new ResetPasswordRequestDto();
  Object.assign(dto, data);
  return dto;
}
