import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class SignupRequestDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;

  @IsString()
  @MinLength(1)
  password_confirm!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(30)
  nickname!: string;
}
