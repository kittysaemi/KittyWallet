import { IsNotEmpty, IsString, Matches } from "class-validator";

export class BudgetCalculatorSourceQueryDto {
  @IsNotEmpty({ message: "계산 기준 월을 선택해 주세요." })
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: "계산 기준 월 형식이 올바르지 않습니다." })
  base_month!: string;
}
