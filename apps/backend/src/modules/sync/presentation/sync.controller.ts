import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { CurrentUser, JwtPayload } from "../../../common/decorators/current-user.decorator";
import { SyncService } from "../application/sync.service";
import { SyncUploadRequestDto } from "./dto/request/sync-upload-request.dto";

@Controller("sync")
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post("upload")
  @HttpCode(200)
  upload(@CurrentUser() user: JwtPayload, @Body() dto: SyncUploadRequestDto) {
    return this.syncService.upload({
      userId: BigInt(user.sub),
      clientId: dto.client_id,
      deviceName: dto.device_name,
      platform: dto.platform,
      items: dto.items
    });
  }
}
