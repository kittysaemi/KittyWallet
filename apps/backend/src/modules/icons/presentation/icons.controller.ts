import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { CurrentUser, JwtPayload } from "../../../common/decorators/current-user.decorator";
import { IconsService } from "../application/icons.service";
import { CreateIconRequestDto } from "./dto/request/create-icon-request.dto";
import { DeleteUnusedIconsRequestDto } from "./dto/request/delete-unused-icons-request.dto";
import { IconListQueryDto } from "./dto/request/icon-list-query.dto";
import { IconOptionQueryDto } from "./dto/request/icon-option-query.dto";
import { UpdateIconRequestDto } from "./dto/request/update-icon-request.dto";

@Controller("icon-options")
export class IconOptionsController {
  constructor(private readonly iconsService: IconsService) {}

  @Get()
  searchIconOptions(@Query() query: IconOptionQueryDto) {
    return this.iconsService.searchIconOptions(query.keyword);
  }
}

@Controller("icons")
export class IconsController {
  constructor(private readonly iconsService: IconsService) {}

  @Get("cleanup-candidates")
  getCleanupCandidates(@CurrentUser() user: JwtPayload) {
    return this.iconsService.getCleanupCandidates(BigInt(user.sub));
  }

  @Get()
  getIcons(@CurrentUser() user: JwtPayload, @Query() query: IconListQueryDto) {
    return this.iconsService.getIcons(
      BigInt(user.sub),
      query.show === undefined ? true : query.show === "true"
    );
  }

  @Post()
  createIcon(@CurrentUser() user: JwtPayload, @Body() dto: CreateIconRequestDto) {
    return this.iconsService.createIcon({
      userId: BigInt(user.sub),
      iconCode: dto.icon_code,
      show: dto.show
    });
  }

  @Delete("cleanup")
  deleteUnusedIcons(@CurrentUser() user: JwtPayload, @Body() dto: DeleteUnusedIconsRequestDto) {
    return this.iconsService.deleteUnusedIcons({
      userId: BigInt(user.sub),
      iconIds: dto.icon_ids.map((iconId) => BigInt(iconId))
    });
  }

  @Put(":id")
  updateIcon(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateIconRequestDto
  ) {
    return this.iconsService.updateIcon({
      iconId: BigInt(id),
      userId: BigInt(user.sub),
      show: dto.show
    });
  }
}
