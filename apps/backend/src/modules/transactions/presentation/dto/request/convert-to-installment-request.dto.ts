import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";
import { SUPPORTED_TIMEZONES } from "../../../../settings/domain/settings-policy";

export class ConvertToInstallmentRequestDto {
  @IsInt()
  @Min(2)
  @Max(36)
  installment_months!: number;

  @IsOptional()
  @IsIn(SUPPORTED_TIMEZONES)
  timezone?: string;
}
