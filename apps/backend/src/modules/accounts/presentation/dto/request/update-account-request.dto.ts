import { IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class UpdateAccountRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(15)
  account_name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  icon_id?: number;
}
