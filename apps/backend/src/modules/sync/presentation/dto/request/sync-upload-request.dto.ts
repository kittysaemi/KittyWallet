import { Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested
} from "class-validator";

export class SyncUploadItemDto {
  @IsString()
  client_temp_id!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  server_id?: number | null;

  @IsIn(["CREATE", "UPDATE", "DELETE"])
  sync_action!: "CREATE" | "UPDATE" | "DELETE";

  @IsObject()
  payload!: Record<string, unknown>;
}

export class SyncUploadRequestDto {
  @IsString()
  client_id!: string;

  @IsOptional()
  @IsString()
  device_name?: string;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncUploadItemDto)
  items!: SyncUploadItemDto[];
}
