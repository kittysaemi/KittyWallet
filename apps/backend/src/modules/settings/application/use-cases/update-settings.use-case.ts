import { HttpStatus, Injectable } from "@nestjs/common";
import { AppException } from "../../../../common/exceptions/app.exception";
import {
  normalizeSettings,
  SettingKey,
  SettingsMap
} from "../../domain/settings-policy";
import { SettingsRepository } from "../../infrastructure/settings.repository";
import { GetSettingsUseCase, SettingsResponse, toPrismaJsonValue } from "./get-settings.use-case";

@Injectable()
export class UpdateSettingsUseCase {
  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly getSettingsUseCase: GetSettingsUseCase
  ) {}

  async execute(userId: bigint, settingsInput: Record<string, unknown>): Promise<SettingsResponse> {
    const settings = normalizeSettings(settingsInput);
    const entries = Object.entries(settings) as [SettingKey, SettingsMap[SettingKey]][];

    if (entries.length === 0) {
      throw new AppException("SETTING_001", "지원하지 않는 설정값입니다.", HttpStatus.BAD_REQUEST);
    }

    await this.settingsRepository.upsertMany(
      entries.map(([settingKey, settingValue]) => ({
        userId,
        settingKey,
        settingValue: toPrismaJsonValue(settingValue)
      }))
    );

    return this.getSettingsUseCase.execute(userId);
  }
}
