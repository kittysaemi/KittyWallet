import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, ValidateIf } from "class-validator";
import { SUPPORTED_TIMEZONES } from "../../../../settings/domain/settings-policy";

export class UpdateTransferRequestDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  from_account_id?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  to_account_id?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;

  @IsOptional()
  @IsDateString()
  transaction_date?: string;

  @IsOptional()
  @ValidateIf((o: UpdateTransferRequestDto) => o.memo !== null)
  @IsString()
  @MaxLength(200)
  memo?: string | null;

  @IsOptional()
  @IsBoolean()
  next_month_cash_yn?: boolean;

  @IsOptional()
  @IsIn(SUPPORTED_TIMEZONES)
  timezone?: string;
}
