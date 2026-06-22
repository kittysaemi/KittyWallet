import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class TextParseRequestDto {
  @IsIn(["receipt-transaction"])
  profile!: "receipt-transaction";

  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  text!: string;

  @IsOptional()
  @IsString()
  locale?: string;
}
