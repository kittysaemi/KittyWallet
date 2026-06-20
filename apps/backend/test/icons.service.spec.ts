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
    providerVersion: null,
    snapshotHash: null,
    searchKeywords: ["wallet"],
    createdAt: now,
    updatedAt: now
  };
  const iconsRepository = {
    findManyForUser: jest.fn(),
    findCleanupCandidates: jest.fn(),
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
        iconDictionary: { ...dictionary, snapshot: null }
      }
    ]);

    await expect(service.getIcons(BigInt(1), true)).resolves.toEqual({
      items: [
        {
          icon_id: 1,
          icon_code: "icon-wallet",
          provider_type: "lucide",
          provider_key: "wallet",
          snapshot: null,
          show: true,
          is_default: true,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z"
        }
      ]
    });
  });

  it("returns a stored snapshot as fallback metadata", async () => {
    iconsRepository.findManyForUser.mockResolvedValue([{ iconId: BigInt(1), userId: null, iconDictionaryId: dictionary.iconDictionaryId, show: true, isDefault: true, createdAt: now, updatedAt: now, iconDictionary: { ...dictionary, snapshot: { snapshotHash: "hash-1", providerType: "lucide", snapshotFormat: "svg", snapshotPayload: "<svg />", sourceProviderKey: "wallet", sourceProviderVersion: "1.17.0", createdAt: now } } }]);

    await expect(service.getIcons(BigInt(1), true)).resolves.toMatchObject({
      items: [{ snapshot: { snapshot_hash: "hash-1", snapshot_format: "svg", snapshot_payload: "<svg />" } }]
    });
  });

  it("returns only repository-filtered cleanup candidates with provider availability", async () => {
    iconsRepository.findCleanupCandidates.mockResolvedValue([
      {
        iconId: BigInt(12),
        userId: BigInt(1),
        iconDictionaryId: dictionary.iconDictionaryId,
        show: true,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
        iconDictionary: { ...dictionary, snapshot: null }
      },
      {
        iconId: BigInt(13),
        userId: BigInt(1),
        iconDictionaryId: BigInt(11),
        show: true,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
        iconDictionary: { ...dictionary, iconDictionaryId: BigInt(11), iconCode: "icon-removed", providerKey: "removed", snapshot: null }
      }
    ]);
    iconProviderAdapter.validate.mockImplementation((providerKey) => providerKey === "wallet");

    await expect(service.getCleanupCandidates(BigInt(1))).resolves.toEqual({
      items: [
        {
          icon_id: 12,
          icon_code: "icon-wallet",
          provider_type: "lucide",
          provider_key: "wallet",
          preview: null,
          is_provider_available: true,
          can_register_again: true,
          created_at: "2026-01-01T00:00:00.000Z"
        },
        {
          icon_id: 13,
          icon_code: "icon-removed",
          provider_type: "lucide",
          provider_key: "removed",
          preview: null,
          is_provider_available: false,
          can_register_again: false,
          created_at: "2026-01-01T00:00:00.000Z"
        }
      ]
    });

    expect(iconsRepository.findCleanupCandidates).toHaveBeenCalledWith(BigInt(1));
  });

  it("marks an icon from an unsupported provider as unavailable without validating it", async () => {
    iconsRepository.findCleanupCandidates.mockResolvedValue([
      {
        iconId: BigInt(14),
        userId: BigInt(1),
        iconDictionaryId: BigInt(12),
        show: true,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
        iconDictionary: { ...dictionary, iconDictionaryId: BigInt(12), providerType: "other", snapshot: null }
      }
    ]);

    await expect(service.getCleanupCandidates(BigInt(1))).resolves.toMatchObject({
      items: [{ is_provider_available: false, can_register_again: false }]
    });
    expect(iconProviderAdapter.validate).not.toHaveBeenCalled();
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
