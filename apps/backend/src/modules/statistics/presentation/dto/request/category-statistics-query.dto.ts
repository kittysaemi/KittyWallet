import { IsDateString, IsIn, IsNumberString, IsOptional } from "class-validator";

export class CategoryStatisticsQueryDto {
  @IsDateString()
  start_date!: string;

  @IsDateString()
  end_date!: string;

  @IsOptional()
  @IsIn(["INCOME", "EXPENSE"])
  transaction_type?: string;

  @IsOptional()
  @IsIn(["ACCOUNT", "CARD"])
  wallet_type?: string;

  @IsOptional()
  @IsNumberString()
  wallet_id?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
