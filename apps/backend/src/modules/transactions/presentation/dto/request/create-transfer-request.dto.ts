import { IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";
import { SUPPORTED_TIMEZONES } from "../../../../settings/domain/settings-policy";

export class CreateTransferRequestDto {
  @IsInt()
  @Min(1)
  from_account_id!: number;

  @IsInt()
  @Min(1)
  to_account_id!: number;

  @IsInt()
  @Min(1)
  amount!: number;

  @IsDateString()
  transaction_date!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  memo?: string;

  @IsOptional()
  @IsIn(SUPPORTED_TIMEZONES)
  timezone?: string;
}
