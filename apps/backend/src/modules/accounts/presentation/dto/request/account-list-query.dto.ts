import { IsBooleanString, IsOptional } from "class-validator";

export class AccountListQueryDto {
  @IsOptional()
  @IsBooleanString()
  include_balance?: string;
}
