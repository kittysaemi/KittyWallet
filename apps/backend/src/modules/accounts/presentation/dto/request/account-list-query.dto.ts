import { IsBooleanString, IsOptional } from "class-validator";

export class AccountListQueryDto {
  @IsOptional()
  @IsBooleanString()
  use_yn?: string;

  @IsOptional()
  @IsBooleanString()
  include_balance?: string;
}
