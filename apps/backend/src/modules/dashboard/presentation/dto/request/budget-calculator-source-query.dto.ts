import { IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";

export class BudgetCalculatorSourceQueryDto {
  @IsNotEmpty({ message: "계산 기준 월을 선택해 주세요." })
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: "계산 기준 월 형식이 올바르지 않습니다." })
  base_month!: string;

  // 기준 월이 지난달일 때만 쓰는 잔액 기준일. 형식·필수 여부·날짜 범위는 UseCase에서 검증하고,
  // 이번 달 요청이면 읽지 않는다.
  @IsOptional()
  @IsString()
  base_date?: string;
}
