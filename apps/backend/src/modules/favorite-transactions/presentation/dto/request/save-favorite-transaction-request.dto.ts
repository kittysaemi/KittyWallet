import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

// 자주 쓰는 거래 등록·수정 공통 요청 본문(자주쓰는거래API.md). 수정도 모든 저장 항목을 전달한다.
// 날짜·할부·n월 현금 동일 사용·고정지출 값은 받지 않는다.
export class SaveFavoriteTransactionRequestDto {
  @IsIn(["INCOME", "EXPENSE"])
  transaction_type!: "INCOME" | "EXPENSE";

  @IsIn(["ACCOUNT", "CARD"])
  wallet_type!: "ACCOUNT" | "CARD";

  @IsInt()
  @Min(1)
  wallet_id!: number;

  @IsInt()
  @Min(1)
  category_id!: number;

  @IsInt()
  @Min(1)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  memo?: string;
}
