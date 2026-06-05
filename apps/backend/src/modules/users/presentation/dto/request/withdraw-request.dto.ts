import { IsString } from 'class-validator';

export class WithdrawRequestDto {
  @IsString()
  confirm_text!: string;
}
