import { IsDateString, IsIn, IsNumberString, IsOptional } from "class-validator";

export class PeriodStatisticsQueryDto {
  @IsDateString()
  start_date!: string;

  @IsDateString()
  end_date!: string;

  @IsOptional()
  @IsIn(["ACCOUNT", "CARD"])
  wallet_type?: string;

  @IsOptional()
  @IsNumberString()
  wallet_id?: string;

  @IsOptional()
  @IsIn(["DAY", "MONTH"])
  group_by?: string;
}
