import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  assertSettingKey,
  mergeWithDefaultSettings,
  PartialSettingsMap,
  SettingKey,
  SettingsMap
} from "../../domain/settings-policy";
import { SettingsRepository } from "../../infrastructure/settings.repository";

export interface SettingsResponse {
  settings: Partial<SettingsMap>;
  updated_at: string | null;
}

@Injectable()
export class GetSettingsUseCase {
  constructor(private readonly settingsRepository: SettingsRepository) {}

  async execute(userId: bigint, key?: string): Promise<SettingsResponse> {
    let settingKey: SettingKey | undefined;

    if (key !== undefined) {
      assertSettingKey(key);
      settingKey = key;
    }

    const settings = await this.settingsRepository.findMany(userId, settingKey);
    const storedSettings = settings.reduce<Record<string, SettingsMap[SettingKey]>>((result, setting) => {
      result[setting.settingKey] = setting.settingValue as SettingsMap[SettingKey];
      return result;
    }, {}) as PartialSettingsMap;
    const mergedSettings = mergeWithDefaultSettings(storedSettings);
    const responseSettings =
      settingKey === undefined
        ? mergedSettings
        : { [settingKey]: mergedSettings[settingKey] };
    const updatedAt = settings.reduce<Date | null>(
      (latest, setting) =>
        latest === null || setting.updatedAt > latest ? setting.updatedAt : latest,
      null
    );

    return {
      settings: responseSettings,
      updated_at: updatedAt?.toISOString() ?? null
    };
  }
}

export function toPrismaJsonValue(value: SettingsMap[SettingKey]): Prisma.InputJsonValue {
  return value;
}
