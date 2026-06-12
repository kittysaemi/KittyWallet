import { IsIn, IsNumberString, IsOptional, Matches } from "class-validator";

export class VisualizationQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  month?: string;

  @IsOptional()
  @IsIn(["ACCOUNT", "CARD"])
  wallet_type?: string;

  @IsOptional()
  @IsNumberString()
  wallet_id?: string;

  @IsOptional()
  @IsIn(["INCOME", "EXPENSE"])
  transaction_type?: string;
}
