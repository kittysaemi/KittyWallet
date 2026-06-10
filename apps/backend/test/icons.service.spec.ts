import { HttpStatus } from "@nestjs/common";
import type { AppException } from "../src/common/exceptions/app.exception";
import type { IconProviderAdapter } from "../src/modules/icons/application/icon-provider.adapter";
import { IconsService } from "../src/modules/icons/application/icons.service";
import { IconsRepository } from "../src/modules/icons/infrastructure/icons.repository";

describe("IconsService", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");
  const dictionary = {
    iconDictionaryId: BigInt(10),
    iconCode: "icon-wallet",
    providerType: "lucide",
    providerKey: "wallet",
    searchKeywords: ["wallet"],
    createdAt: now,
    updatedAt: now
  };
  const iconsRepository = {
    findManyForUser: jest.fn(),
    findAvailableIconByDictionaryId: jest.fn(),
    findEditableIcon: jest.fn(),
    createUserIcon: jest.fn(),
    updateIcon: jest.fn(),
    findDictionaryByIconCode: jest.fn(),
    findDictionaryByProvider: jest.fn(),
    searchDictionaries: jest.fn(),
    upsertDictionary: jest.fn()
  } as unknown as jest.Mocked<IconsRepository>;
  const iconProviderAdapter = {
    providerType: "lucide",
    search: jest.fn(),
    resolveByIconCode: jest.fn(),
    validate: jest.fn()
  } as jest.Mocked<IconProviderAdapter>;

  const service = new IconsService(iconsRepository, iconProviderAdapter);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns default and user icons with API field names", async () => {
    iconsRepository.findManyForUser.mockResolvedValue([
      {
        iconId: BigInt(1),
        userId: null,
        iconDictionaryId: dictionary.iconDictionaryId,
        show: true,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
        iconDictionary: dictionary
      }
    ]);

    await expect(service.getIcons(BigInt(1), true)).resolves.toEqual({
      items: [
        {
          icon_id: 1,
          icon_code: "icon-wallet",
          provider_type: "lucide",
          provider_key: "wallet",
          show: true,
          is_default: true,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z"
        }
      ]
    });
  });

  it("rejects duplicate available icons", async () => {
    iconsRepository.findDictionaryByIconCode.mockResolvedValue(dictionary);
    iconsRepository.findAvailableIconByDictionaryId.mockResolvedValue({
      iconId: BigInt(2),
      userId: BigInt(1),
      iconDictionaryId: dictionary.iconDictionaryId,
      show: true,
      isDefault: false,
      createdAt: now,
      updatedAt: now
    });

    await expect(
      service.createIcon({ userId: BigInt(1), iconCode: "icon-wallet" })
    ).rejects.toMatchObject({
      code: "ICON_001",
      statusCode: HttpStatus.CONFLICT
    } satisfies Partial<AppException>);
  });

  it("rejects icon codes that cannot be resolved by provider", async () => {
    iconsRepository.findDictionaryByIconCode.mockResolvedValue(null);
    iconProviderAdapter.resolveByIconCode.mockReturnValue(null);

    await expect(
      service.createIcon({ userId: BigInt(1), iconCode: "icon-not-registered" })
    ).rejects.toMatchObject({
      code: "ICON_003",
      statusCode: HttpStatus.BAD_REQUEST
    } satisfies Partial<AppException>);

    expect(iconsRepository.upsertDictionary).not.toHaveBeenCalled();
    expect(iconsRepository.createUserIcon).not.toHaveBeenCalled();
  });

  it("returns provider search options", async () => {
    iconsRepository.searchDictionaries.mockResolvedValue([]);
    iconProviderAdapter.search.mockReturnValue([
      {
        iconCode: "icon-cat",
        providerType: "lucide",
        providerKey: "cat",
        searchKeywords: ["cat"]
      }
    ]);

    await expect(service.searchIconOptions("cat")).resolves.toEqual({
      items: [
        {
          icon_code: "icon-cat",
          provider_type: "lucide",
          provider_key: "cat"
        }
      ]
    });
  });
});
