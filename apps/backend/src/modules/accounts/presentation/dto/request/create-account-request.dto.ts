import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class CreateAccountRequestDto {
  @IsString()
  @MaxLength(15)
  account_name!: string;

  @IsInt()
  @Min(0)
  initial_balance!: number;

  @IsInt()
  @Min(1)
  icon_id!: number;

  @IsOptional()
  @IsBoolean()
  use_yn?: boolean;

  @IsOptional()
  @IsBoolean()
  allow_negative_balance?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  negative_balance_limit?: number;
}
