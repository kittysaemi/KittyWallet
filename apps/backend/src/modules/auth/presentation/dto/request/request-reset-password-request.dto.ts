import { IsEmail } from 'class-validator';

export class RequestResetPasswordRequestDto {
  @IsEmail()
  email!: string;
}
