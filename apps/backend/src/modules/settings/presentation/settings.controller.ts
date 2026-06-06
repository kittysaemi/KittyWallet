import { Body, Controller, Get, Put, Query } from "@nestjs/common";
import { CurrentUser, JwtPayload } from "../../../common/decorators/current-user.decorator";
import { GetSettingsUseCase } from "../application/use-cases/get-settings.use-case";
import { UpdateSettingsUseCase } from "../application/use-cases/update-settings.use-case";
import { SettingsQueryDto } from "./dto/request/settings-query.dto";
import { UpdateSettingsRequestDto } from "./dto/request/update-settings-request.dto";

@Controller("settings")
export class SettingsController {
  constructor(
    private readonly getSettingsUseCase: GetSettingsUseCase,
    private readonly updateSettingsUseCase: UpdateSettingsUseCase
  ) {}

  @Get()
  getSettings(@CurrentUser() user: JwtPayload, @Query() query: SettingsQueryDto) {
    return this.getSettingsUseCase.execute(BigInt(user.sub), query.key);
  }

  @Put()
  updateSettings(@CurrentUser() user: JwtPayload, @Body() dto: UpdateSettingsRequestDto) {
    return this.updateSettingsUseCase.execute(BigInt(user.sub), dto.settings);
  }
}
