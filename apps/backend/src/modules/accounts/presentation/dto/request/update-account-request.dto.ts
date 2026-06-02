import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class UpdateAccountRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  account_name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  icon_id?: number;

  @IsOptional()
  @IsBoolean()
  use_yn?: boolean;
}
