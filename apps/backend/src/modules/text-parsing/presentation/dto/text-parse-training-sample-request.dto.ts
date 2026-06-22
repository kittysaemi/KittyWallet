import { IsIn, IsObject, IsString, MaxLength, MinLength } from "class-validator";

export class TextParseTrainingSampleRequestDto {
  @IsIn(["receipt-transaction"])
  profile!: "receipt-transaction";

  @IsIn(["OCR_IMAGE", "PASTED_TEXT"])
  source_type!: "OCR_IMAGE" | "PASTED_TEXT";

  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  source_text!: string;

  @IsObject()
  final_draft!: Record<string, unknown>;

  @IsString()
  @MaxLength(100)
  parser_version!: string;
}
