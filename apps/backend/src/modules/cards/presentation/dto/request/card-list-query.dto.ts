import { IsBooleanString, IsOptional } from "class-validator";

export class CardListQueryDto {
  @IsOptional()
  @IsBooleanString()
  use_yn?: string;
}
