import { IsDateString, IsIn, IsNumberString, IsOptional, IsString } from "class-validator";

export class TransactionListQueryDto {
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsIn(["ACCOUNT", "CARD"])
  wallet_type?: string;

  @IsOptional()
  @IsNumberString()
  wallet_id?: string;

  @IsOptional()
  @IsNumberString()
  category_id?: string;

  @IsOptional()
  @IsIn(["INCOME", "EXPENSE"])
  transaction_type?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsIn(["transaction_date_desc", "transaction_date_asc", "amount_desc", "amount_asc"])
  sort?: string;
}
