import { IsBoolean, IsOptional } from "class-validator";

export class UpdateIconRequestDto {
  @IsOptional()
  @IsBoolean()
  show?: boolean;
}
