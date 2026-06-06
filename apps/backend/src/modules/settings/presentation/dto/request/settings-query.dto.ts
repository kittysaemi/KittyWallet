import { IsOptional, IsString } from "class-validator";

export class SettingsQueryDto {
  @IsOptional()
  @IsString()
  key?: string;
}
