import { IsNumberString, IsOptional } from "class-validator";

export class TransactionRecentQueryDto {
  @IsOptional()
  @IsNumberString()
  limit?: string;
}
