import { IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, ValidateIf } from "class-validator";

export class UpdateTransactionRequestDto {
  @IsOptional()
  @IsIn(["ACCOUNT", "CARD"])
  wallet_type?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  wallet_id?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  category_id?: number;

  @IsOptional()
  @IsIn(["INCOME", "EXPENSE"])
  transaction_type?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;

  @IsOptional()
  @ValidateIf((o: UpdateTransactionRequestDto) => o.memo !== null)
  @IsString()
  @MaxLength(200)
  memo?: string | null;

  @IsOptional()
  @IsDateString()
  transaction_date?: string;
}
