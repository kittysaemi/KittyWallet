import { validate } from 'class-validator';
import { RequestResetPasswordRequestDto } from '../src/modules/auth/presentation/dto/request/request-reset-password-request.dto';

describe('RequestResetPasswordRequestDto', () => {
  it('accepts a valid email', async () => {
    const dto = new RequestResetPasswordRequestDto();
    dto.email = 'test@example.com';

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects an invalid email', async () => {
    const dto = new RequestResetPasswordRequestDto();
    dto.email = 'not-email';

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('email');
  });
});
