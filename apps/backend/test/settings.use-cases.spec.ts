import { HttpStatus } from "@nestjs/common";
import type { AppException } from "../src/common/exceptions/app.exception";
import { GetSettingsUseCase } from "../src/modules/settings/application/use-cases/get-settings.use-case";
import { UpdateSettingsUseCase } from "../src/modules/settings/application/use-cases/update-settings.use-case";
import { SettingsRepository } from "../src/modules/settings/infrastructure/settings.repository";

describe("SettingsUseCases", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");
  const later = new Date("2026-01-02T00:00:00.000Z");

  const makeSetting = (settingKey: string, settingValue: unknown, updatedAt = now) => ({
    settingId: BigInt(1),
    userId: BigInt(1),
    settingKey,
    settingValue,
    createdAt: now,
    updatedAt
  });

  const settingsRepository = {
    findMany: jest.fn(),
    upsertMany: jest.fn()
  } as unknown as jest.Mocked<SettingsRepository>;
  const getSettingsUseCase = new GetSettingsUseCase(settingsRepository);
  const updateSettingsUseCase = new UpdateSettingsUseCase(
    settingsRepository,
    getSettingsUseCase
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns all settings with defaults merged with stored values", async () => {
    settingsRepository.findMany.mockResolvedValue([
      makeSetting("theme", "dark"),
      makeSetting("transaction_list_page_size", 50, later)
    ] as any);

    await expect(getSettingsUseCase.execute(BigInt(1))).resolves.toEqual({
      settings: {
        theme: "dark",
        currency: "KRW",
        sync_enabled: true,
        transaction_list_page_size: 50
      },
      updated_at: "2026-01-02T00:00:00.000Z"
    });
  });

  it("returns a single setting when key query is provided", async () => {
    settingsRepository.findMany.mockResolvedValue([]);

    await expect(getSettingsUseCase.execute(BigInt(1), "theme")).resolves.toEqual({
      settings: {
        theme: "system"
      },
      updated_at: null
    });
    expect(settingsRepository.findMany).toHaveBeenCalledWith(BigInt(1), "theme");
  });

  it("upserts valid settings by user_id and setting_key", async () => {
    settingsRepository.upsertMany.mockResolvedValue();
    settingsRepository.findMany.mockResolvedValue([
      makeSetting("theme", "light"),
      makeSetting("sync_enabled", false)
    ] as any);

    await expect(
      updateSettingsUseCase.execute(BigInt(1), {
        theme: "light",
        sync_enabled: false
      })
    ).resolves.toEqual({
      settings: {
        theme: "light",
        currency: "KRW",
        sync_enabled: false,
        transaction_list_page_size: 20
      },
      updated_at: "2026-01-01T00:00:00.000Z"
    });
    expect(settingsRepository.upsertMany).toHaveBeenCalledWith([
      { userId: BigInt(1), settingKey: "theme", settingValue: "light" },
      { userId: BigInt(1), settingKey: "sync_enabled", settingValue: false }
    ]);
  });

  it("rejects unsupported setting keys", async () => {
    await expect(getSettingsUseCase.execute(BigInt(1), "unknown")).rejects.toMatchObject({
      code: "SETTING_001",
      statusCode: HttpStatus.BAD_REQUEST
    } satisfies Partial<AppException>);
  });

  it("rejects invalid setting values", async () => {
    await expect(
      updateSettingsUseCase.execute(BigInt(1), {
        theme: "blue"
      })
    ).rejects.toMatchObject({
      code: "SETTING_001",
      statusCode: HttpStatus.BAD_REQUEST
    } satisfies Partial<AppException>);
  });
});
