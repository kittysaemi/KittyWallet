import { IsNotEmpty, IsString, Matches } from "class-validator";

// 계산 기간(예산계산기정책.md 4.1). 실제 존재하는 날짜인지, 시작일이 오늘 이후인지,
// 시작일이 종료일보다 늦은지는 UseCase에서 사용자 시간대 기준으로 검증한다.
const DATE_FORMAT = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export class BudgetCalculatorSourceQueryDto {
  @IsNotEmpty({ message: "계산 기간을 입력해 주세요." })
  @IsString()
  @Matches(DATE_FORMAT, { message: "계산 기간 형식이 올바르지 않습니다." })
  start_date!: string;

  @IsNotEmpty({ message: "계산 기간을 입력해 주세요." })
  @IsString()
  @Matches(DATE_FORMAT, { message: "계산 기간 형식이 올바르지 않습니다." })
  end_date!: string;
}
