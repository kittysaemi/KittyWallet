import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class CreateIconRequestDto {
  @IsString()
  @MaxLength(80)
  @Matches(/^[a-z0-9-]+$/)
  icon_code!: string;

  @IsOptional()
  @IsBoolean()
  show?: boolean;
}
