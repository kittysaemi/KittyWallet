import { IsObject } from "class-validator";

export class UpdateSettingsRequestDto {
  @IsObject()
  settings!: Record<string, unknown>;
}
