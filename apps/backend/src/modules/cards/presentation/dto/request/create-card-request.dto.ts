import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class CreateCardRequestDto {
  @IsString()
  @MaxLength(15)
  card_name!: string;

  @IsInt()
  @Min(1)
  icon_id!: number;

  @IsOptional()
  @IsBoolean()
  use_yn?: boolean;
}
