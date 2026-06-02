import { HttpStatus, Injectable } from "@nestjs/common";
import { Category } from "@prisma/client";
import { AppException } from "../../../common/exceptions/app.exception";
import {
  CategoriesRepository,
  CategoryWithUserSettings
} from "../infrastructure/categories.repository";

export interface CategoryItem {
  category_id: number;
  category_name: string;
  icon_id: number;
  show: boolean;
  is_default: boolean;
  editable: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateCategoryCommand {
  userId: bigint;
  categoryName: string;
  iconId: bigint;
  show?: boolean;
}

interface UpdateCategoryCommand {
  categoryId: bigint;
  userId: bigint;
  categoryName?: string;
  iconId?: bigint;
  show?: boolean;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async getCategories(userId: bigint, show?: boolean): Promise<{ items: CategoryItem[] }> {
    const categories = await this.categoriesRepository.findManyForUser(userId);
    const items = categories.map((category) => this.toItem(category));

    return {
      items: show === undefined ? items : items.filter((item) => item.show === show)
    };
  }

  async createCategory(command: CreateCategoryCommand): Promise<{ category_id: number }> {
    const categoryName = this.normalizeName(command.categoryName);
    await this.assertDuplicateName(categoryName, command.userId);
    await this.assertIconExists(command.iconId, command.userId);

    const category = await this.categoriesRepository.createUserCategory({
      user: { connect: { userId: command.userId } },
      icon: { connect: { iconId: command.iconId } },
      categoryName,
      show: command.show ?? true,
      isDefault: false
    });

    return { category_id: Number(category.categoryId) };
  }

  async updateCategory(
    command: UpdateCategoryCommand
  ): Promise<Pick<CategoryItem, "category_id" | "show">> {
    if (
      command.categoryName === undefined &&
      command.iconId === undefined &&
      command.show === undefined
    ) {
      throw new AppException(
        "VALIDATION_001",
        "수정 가능한 필드가 없습니다.",
        HttpStatus.BAD_REQUEST
      );
    }

    const category = await this.categoriesRepository.findAvailableCategoryById(
      command.categoryId,
      command.userId
    );
    if (!category) {
      throw new AppException("CATEGORY_002", "카테고리를 찾을 수 없습니다.", HttpStatus.NOT_FOUND);
    }

    if (category.isDefault) {
      return this.updateDefaultCategory(category, command);
    }

    return this.updateUserCategory(category, command);
  }

  private async updateDefaultCategory(
    category: CategoryWithUserSettings,
    command: UpdateCategoryCommand
  ): Promise<Pick<CategoryItem, "category_id" | "show">> {
    if (command.categoryName !== undefined || command.iconId !== undefined) {
      throw new AppException(
        "VALIDATION_001",
        "기본 카테고리는 명칭과 아이콘을 수정할 수 없습니다.",
        HttpStatus.BAD_REQUEST
      );
    }

    if (command.show === undefined) {
      throw new AppException(
        "VALIDATION_001",
        "수정 가능한 필드가 없습니다.",
        HttpStatus.BAD_REQUEST
      );
    }

    const setting = await this.categoriesRepository.upsertDefaultCategoryShow(
      command.userId,
      category.categoryId,
      command.show
    );

    return {
      category_id: Number(category.categoryId),
      show: setting.show
    };
  }

  private async updateUserCategory(
    category: Category,
    command: UpdateCategoryCommand
  ): Promise<Pick<CategoryItem, "category_id" | "show">> {
    const data: {
      categoryName?: string;
      icon?: { connect: { iconId: bigint } };
      show?: boolean;
    } = {};

    if (command.categoryName !== undefined) {
      const categoryName = this.normalizeName(command.categoryName);
      await this.assertDuplicateName(categoryName, command.userId, category.categoryId);
      data.categoryName = categoryName;
    }

    if (command.iconId !== undefined) {
      await this.assertIconExists(command.iconId, command.userId);
      data.icon = { connect: { iconId: command.iconId } };
    }

    if (command.show !== undefined) {
      data.show = command.show;
    }

    const updated = await this.categoriesRepository.updateUserCategory(category.categoryId, data);

    return {
      category_id: Number(updated.categoryId),
      show: updated.show
    };
  }

  private normalizeName(categoryName: string): string {
    const normalizedName = categoryName.trim();
    if (!normalizedName) {
      throw new AppException("VALIDATION_001", "카테고리명을 입력해주세요.", HttpStatus.BAD_REQUEST);
    }
    return normalizedName;
  }

  private async assertDuplicateName(
    categoryName: string,
    userId: bigint,
    excludeCategoryId?: bigint
  ): Promise<void> {
    const duplicate = await this.categoriesRepository.findDuplicateName(
      categoryName,
      userId,
      excludeCategoryId
    );
    if (duplicate) {
      throw new AppException(
        "CATEGORY_003",
        "이미 사용 중인 카테고리명입니다.",
        HttpStatus.CONFLICT
      );
    }
  }

  private async assertIconExists(iconId: bigint, userId: bigint): Promise<void> {
    const icon = await this.categoriesRepository.findAvailableIcon(iconId, userId);
    if (!icon) {
      throw new AppException("ICON_002", "아이콘을 찾을 수 없습니다.", HttpStatus.NOT_FOUND);
    }
  }

  private toItem(category: CategoryWithUserSettings): CategoryItem {
    const userSetting = category.categoryUserSettings[0];
    const show = category.isDefault ? (userSetting?.show ?? category.show) : category.show;

    return {
      category_id: Number(category.categoryId),
      category_name: category.categoryName,
      icon_id: Number(category.iconId),
      show,
      is_default: category.isDefault,
      editable: !category.isDefault,
      created_at: category.createdAt.toISOString(),
      updated_at: category.updatedAt.toISOString()
    };
  }
}
