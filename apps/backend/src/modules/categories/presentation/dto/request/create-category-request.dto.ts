import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class CreateCategoryRequestDto {
  @IsString()
  @MaxLength(50)
  category_name!: string;

  @IsInt()
  @Min(1)
  icon_id!: number;

  @IsOptional()
  @IsBoolean()
  show?: boolean;
}
