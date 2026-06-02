import { IsString, MaxLength } from "class-validator";

export class IconOptionQueryDto {
  @IsString()
  @MaxLength(80)
  keyword!: string;
}
