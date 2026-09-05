import { IsDateString, IsIn, IsNumberString, IsOptional, IsString, Matches } from "class-validator";

// 다중 선택 필터(#353)는 쉼표 구분 문자열로 받는다.
// - 배열 쿼리 파라미터(`category_ids[]=1&category_ids[]=2`)는 axios/qs의 브래킷 표기에 의존하고
//   DTO에서 배열 변환/검증이 필요한 반면, 쉼표 구분 문자열은 단순 문자열로 검증할 수 있고
//   로그/URL에서도 읽기 쉽다. 이 저장소에는 기존 배열 쿼리 파라미터 사례가 없어 새로 정한 규칙이다.
// - 지갑은 (지갑유형, 지갑ID) 쌍이라 `ACCOUNT:1,CARD:2` 형태로 받는다(프론트 선택 옵션 id와 동일한 표기).
// 단일 값 파라미터(category_id/wallet_type/wallet_id)는 검색/지갑별 거래내역 등 기존 호출부가
// 그대로 사용하므로 유지한다.
const CATEGORY_IDS_PATTERN = /^\d+(,\d+)*$/;
const WALLET_IDS_PATTERN = /^(ACCOUNT|CARD):\d+(,(ACCOUNT|CARD):\d+)*$/;

export class TransactionListQueryDto {
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsIn(["ACCOUNT", "CARD"])
  wallet_type?: string;

  @IsOptional()
  @IsNumberString()
  wallet_id?: string;

  @IsOptional()
  @IsNumberString()
  category_id?: string;

  @IsOptional()
  @Matches(CATEGORY_IDS_PATTERN, {
    message: "category_ids는 쉼표로 구분된 숫자 목록이어야 합니다."
  })
  category_ids?: string;

  @IsOptional()
  @Matches(WALLET_IDS_PATTERN, {
    message: "wallet_ids는 쉼표로 구분된 ACCOUNT:1 형태의 목록이어야 합니다."
  })
  wallet_ids?: string;

  @IsOptional()
  @IsIn(["true", "false"])
  exclude_installment?: string;

  @IsOptional()
  @IsIn(["INCOME", "EXPENSE"])
  transaction_type?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsIn(["transaction_date_desc", "transaction_date_asc", "amount_desc", "amount_asc"])
  sort?: string;
}
