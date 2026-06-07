import { IsEmail, IsString, MinLength } from 'class-validator';

export class ResetPasswordRequestDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  reset_token!: string;

  @IsString()
  @MinLength(8)
  new_password!: string;

  @IsString()
  @MinLength(8)
  new_password_confirm!: string;
}
