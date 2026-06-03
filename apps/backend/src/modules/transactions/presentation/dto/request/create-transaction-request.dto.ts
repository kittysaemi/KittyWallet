import { IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class CreateTransactionRequestDto {
  @IsIn(["ACCOUNT", "CARD"])
  wallet_type!: "ACCOUNT" | "CARD";

  @IsInt()
  @Min(1)
  wallet_id!: number;

  @IsInt()
  @Min(1)
  category_id!: number;

  @IsIn(["INCOME", "EXPENSE"])
  transaction_type!: "INCOME" | "EXPENSE";

  @IsInt()
  @Min(1)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  memo?: string;

  @IsDateString()
  transaction_date!: string;
}
