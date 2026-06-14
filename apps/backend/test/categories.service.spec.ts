import { HttpStatus } from "@nestjs/common";
import type { AppException } from "../src/common/exceptions/app.exception";
import { CategoriesService } from "../src/modules/categories/application/categories.service";
import { CategoriesRepository } from "../src/modules/categories/infrastructure/categories.repository";

describe("CategoriesService", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");
  const categoriesRepository = {
    findManyForUser: jest.fn(),
    findAvailableCategoryById: jest.fn(),
    findDuplicateName: jest.fn(),
    findAvailableIcon: jest.fn(),
    createUserCategory: jest.fn(),
    updateUserCategory: jest.fn(),
    upsertCategoryUserSetting: jest.fn()
  } as unknown as jest.Mocked<CategoriesRepository>;

  const service = new CategoriesService(categoriesRepository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns effective show and editable flags for default categories", async () => {
    categoriesRepository.findManyForUser.mockResolvedValue([
      {
        categoryId: BigInt(1),
        userId: null,
        iconId: BigInt(10),
        categoryName: "식비",
        show: true,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
        icon: {
          iconId: BigInt(10),
          userId: null,
          iconDictionaryId: BigInt(20),
          show: true,
          isDefault: true,
          createdAt: now,
          updatedAt: now,
          iconDictionary: {
            iconDictionaryId: BigInt(20),
            iconCode: "food",
            providerType: "material",
            providerKey: "restaurant",
            createdAt: now,
            updatedAt: now
          }
        },
        categoryUserSettings: [
          {
            categoryUserSettingId: BigInt(100),
            userId: BigInt(1),
            categoryId: BigInt(1),
            show: false,
            includeInStatistics: false,
            createdAt: now,
            updatedAt: now
          }
        ]
      }
    ]);

    await expect(service.getCategories(BigInt(1))).resolves.toEqual({
      items: [
        {
          category_id: 1,
          category_name: "식비",
          icon_id: 10,
          icon: {
            icon_id: 10,
            icon_code: "food",
            provider_type: "material",
            provider_key: "restaurant"
          },
          show: false,
          include_in_statistics: false,
          is_default: true,
          editable: false,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z"
        }
      ]
    });
  });

  it("keeps statistics exclusion independent from show filtering", async () => {
    categoriesRepository.findManyForUser.mockResolvedValue([
      {
        categoryId: BigInt(1),
        userId: null,
        iconId: BigInt(10),
        categoryName: "식비",
        show: true,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
        icon: {
          iconId: BigInt(10),
          userId: null,
          iconDictionaryId: BigInt(20),
          show: true,
          isDefault: true,
          createdAt: now,
          updatedAt: now,
          iconDictionary: {
            iconDictionaryId: BigInt(20),
            iconCode: "food",
            providerType: "material",
            providerKey: "restaurant",
            searchKeywords: [],
            createdAt: now,
            updatedAt: now
          }
        },
        categoryUserSettings: [
          {
            categoryUserSettingId: BigInt(100),
            userId: BigInt(1),
            categoryId: BigInt(1),
            show: true,
            includeInStatistics: false,
            createdAt: now,
            updatedAt: now
          }
        ]
      }
    ]);

    await expect(service.getCategories(BigInt(1), true)).resolves.toMatchObject({
      items: [
        {
          category_id: 1,
          show: true,
          include_in_statistics: false
        }
      ]
    });
  });

  it("rejects duplicate category names on create", async () => {
    categoriesRepository.findDuplicateName.mockResolvedValue({
      categoryId: BigInt(1),
      userId: null,
      iconId: BigInt(10),
      categoryName: "식비",
      show: true,
      isDefault: true,
      createdAt: now,
      updatedAt: now
    });

    await expect(
      service.createCategory({
        userId: BigInt(1),
        categoryName: "식비",
        iconId: BigInt(10)
      })
    ).rejects.toMatchObject({
      code: "CATEGORY_003",
      statusCode: HttpStatus.CONFLICT
    } satisfies Partial<AppException>);
  });

  it("stores default category show per user", async () => {
    categoriesRepository.findAvailableCategoryById.mockResolvedValue({
      categoryId: BigInt(1),
      userId: null,
      iconId: BigInt(10),
      categoryName: "식비",
      show: true,
      isDefault: true,
      createdAt: now,
      updatedAt: now,
      categoryUserSettings: []
    });
    categoriesRepository.upsertCategoryUserSetting.mockResolvedValue({
      categoryUserSettingId: BigInt(100),
      userId: BigInt(1),
      categoryId: BigInt(1),
      show: false,
      includeInStatistics: true,
      createdAt: now,
      updatedAt: now
    });

    await expect(
      service.updateCategory({
        userId: BigInt(1),
        categoryId: BigInt(1),
        show: false
      })
    ).resolves.toEqual({
      category_id: 1,
      show: false,
      include_in_statistics: true
    });
  });

  it("updates default category statistics inclusion per user", async () => {
    categoriesRepository.findAvailableCategoryById.mockResolvedValue({
      categoryId: BigInt(1),
      userId: null,
      iconId: BigInt(10),
      categoryName: "식비",
      show: true,
      isDefault: true,
      createdAt: now,
      updatedAt: now,
      categoryUserSettings: []
    });
    categoriesRepository.upsertCategoryUserSetting.mockResolvedValue({
      categoryUserSettingId: BigInt(100),
      userId: BigInt(1),
      categoryId: BigInt(1),
      show: true,
      includeInStatistics: false,
      createdAt: now,
      updatedAt: now
    });

    await expect(
      service.updateCategory({
        userId: BigInt(1),
        categoryId: BigInt(1),
        includeInStatistics: false
      })
    ).resolves.toEqual({
      category_id: 1,
      show: true,
      include_in_statistics: false
    });
    expect(categoriesRepository.upsertCategoryUserSetting).toHaveBeenCalledWith(
      BigInt(1),
      BigInt(1),
      { includeInStatistics: false },
      true
    );
  });

  it("rejects default category name and icon changes", async () => {
    categoriesRepository.findAvailableCategoryById.mockResolvedValue({
      categoryId: BigInt(1),
      userId: null,
      iconId: BigInt(10),
      categoryName: "식비",
      show: true,
      isDefault: true,
      createdAt: now,
      updatedAt: now,
      categoryUserSettings: []
    });

    await expect(
      service.updateCategory({
        userId: BigInt(1),
        categoryId: BigInt(1),
        categoryName: "외식"
      })
    ).rejects.toMatchObject({
      code: "VALIDATION_001",
      statusCode: HttpStatus.BAD_REQUEST
    } satisfies Partial<AppException>);
  });

  it("updates user category name, icon, and show", async () => {
    categoriesRepository.findAvailableCategoryById.mockResolvedValue({
      categoryId: BigInt(2),
      userId: BigInt(1),
      iconId: BigInt(10),
      categoryName: "반려동물",
      show: true,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
      categoryUserSettings: []
    });
    categoriesRepository.findDuplicateName.mockResolvedValue(null);
    categoriesRepository.findAvailableIcon.mockResolvedValue({
      iconId: BigInt(11),
      userId: null,
      iconDictionaryId: BigInt(20),
      show: true,
      isDefault: true,
      createdAt: now,
      updatedAt: now
    });
    categoriesRepository.updateUserCategory.mockResolvedValue({
      categoryId: BigInt(2),
      userId: BigInt(1),
      iconId: BigInt(11),
      categoryName: "외식",
      show: false,
      isDefault: false,
      createdAt: now,
      updatedAt: now
    });
    categoriesRepository.upsertCategoryUserSetting.mockResolvedValue({
      categoryUserSettingId: BigInt(101),
      userId: BigInt(1),
      categoryId: BigInt(2),
      show: false,
      includeInStatistics: false,
      createdAt: now,
      updatedAt: now
    });

    await expect(
      service.updateCategory({
        userId: BigInt(1),
        categoryId: BigInt(2),
        categoryName: "외식",
        iconId: BigInt(11),
        show: false,
        includeInStatistics: false
      })
    ).resolves.toEqual({
      category_id: 2,
      show: false,
      include_in_statistics: false
    });
  });
});
