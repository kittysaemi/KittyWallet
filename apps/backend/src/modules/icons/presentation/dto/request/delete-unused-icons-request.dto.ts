import { ArrayNotEmpty, ArrayUnique, IsArray, IsInt, Min } from "class-validator";

export class DeleteUnusedIconsRequestDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  icon_ids!: number[];
}
