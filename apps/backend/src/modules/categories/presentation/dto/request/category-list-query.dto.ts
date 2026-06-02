import { IsBooleanString, IsOptional } from "class-validator";

export class CategoryListQueryDto {
  @IsOptional()
  @IsBooleanString()
  show?: string;
}
