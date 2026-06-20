import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested
} from "class-validator";
import { Type } from "class-transformer";
import { SUPPORTED_TIMEZONES } from "../../../../settings/domain/settings-policy";

class InstallmentDto {
  @IsInt()
  @Min(2)
  installment_months!: number;
}

export class CreateTransactionRequestDto {
  @IsIn(["ACCOUNT", "CARD"])
  wallet_type!: "ACCOUNT" | "CARD";

  @IsInt()
  @Min(1)
  wallet_id!: number;

  @IsInt()
  @Min(1)
  category_id!: number;

  @IsIn(["INCOME", "EXPENSE"])
  transaction_type!: "INCOME" | "EXPENSE";

  @IsInt()
  @Min(1)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  memo?: string;

  @IsDateString()
  transaction_date!: string;

  @IsOptional()
  @IsIn(SUPPORTED_TIMEZONES)
  timezone?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => InstallmentDto)
  installment?: InstallmentDto;
}
