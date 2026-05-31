import { IsString, MinLength, MaxLength } from 'class-validator';

export class ResetPasswordRequestDto {
  @IsString()
  resetToken!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  newPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  confirmPassword!: string;
}
