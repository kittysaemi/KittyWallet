import { IsBooleanString, IsOptional } from "class-validator";

export class IconListQueryDto {
  @IsOptional()
  @IsBooleanString()
  show?: string;
}
