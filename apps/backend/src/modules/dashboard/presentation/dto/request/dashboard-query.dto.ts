import { IsDateString, IsIn, IsInt, IsOptional, Max, Min } from "class-validator";
import { Transform } from "class-transformer";

export class DashboardQueryDto {
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : 5))
  @IsInt()
  @Min(1)
  @Max(20)
  recent_limit?: number = 5;

  @IsOptional()
  @IsIn(["TODAY", "WEEK", "MONTH"])
  summary_period?: "TODAY" | "WEEK" | "MONTH" = "MONTH";

  @IsOptional()
  @IsDateString()
  base_date?: string;
}
