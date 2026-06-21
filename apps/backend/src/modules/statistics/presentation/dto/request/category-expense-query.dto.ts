import { IsIn, IsNumberString, IsOptional, Matches } from "class-validator";

export class CategoryExpenseQueryDto {
  @IsOptional()
  @IsIn(["all", "year", "month"])
  period_type?: "all" | "year" | "month";

  @IsOptional()
  @Matches(/^\d{4}$/)
  year?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  month?: string;

  @IsOptional()
  @IsIn(["ACCOUNT", "CARD"])
  wallet_type?: string;

  @IsOptional()
  @IsNumberString()
  wallet_id?: string;
}
