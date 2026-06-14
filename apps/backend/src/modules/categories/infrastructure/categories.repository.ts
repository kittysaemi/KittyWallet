import { Injectable } from "@nestjs/common";
import { Category, CategoryUserSetting, Icon, IconDictionary, Prisma } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";

export type CategoryWithUserSettings = Category & {
  categoryUserSettings: CategoryUserSetting[];
  icon: Icon & { iconDictionary: IconDictionary };
};

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyForUser(userId: bigint): Promise<CategoryWithUserSettings[]> {
    return this.prisma.category.findMany({
      where: {
        OR: [{ isDefault: true }, { userId }]
      },
      include: {
        icon: { include: { iconDictionary: true } },
        categoryUserSettings: {
          where: { userId },
          take: 1
        }
      },
      orderBy: { categoryId: "asc" }
    });
  }

  findAvailableCategoryById(
    categoryId: bigint,
    userId: bigint
  ): Promise<CategoryWithUserSettings | null> {
    return this.prisma.category.findFirst({
      where: {
        categoryId,
        OR: [{ isDefault: true }, { userId }]
      },
      include: {
        icon: { include: { iconDictionary: true } },
        categoryUserSettings: {
          where: { userId },
          take: 1
        }
      }
    });
  }

  findDuplicateName(
    categoryName: string,
    userId: bigint,
    excludeCategoryId?: bigint
  ): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: {
        categoryName,
        ...(excludeCategoryId === undefined ? {} : { categoryId: { not: excludeCategoryId } }),
        OR: [{ isDefault: true }, { userId }]
      }
    });
  }

  findAvailableIcon(iconId: bigint, userId: bigint): Promise<Icon | null> {
    return this.prisma.icon.findFirst({
      where: {
        iconId,
        OR: [{ isDefault: true }, { userId }]
      }
    });
  }

  createUserCategory(data: Prisma.CategoryCreateInput): Promise<Category> {
    return this.prisma.category.create({ data });
  }

  updateUserCategory(categoryId: bigint, data: Prisma.CategoryUpdateInput): Promise<Category> {
    return this.prisma.category.update({
      where: { categoryId },
      data
    });
  }

  upsertCategoryUserSetting(
    userId: bigint,
    categoryId: bigint,
    data: { show?: boolean; includeInStatistics?: boolean },
    createShow: boolean
  ): Promise<CategoryUserSetting> {
    return this.prisma.categoryUserSetting.upsert({
      where: {
        userId_categoryId: {
          userId,
          categoryId
        }
      },
      update: data,
      create: {
        user: { connect: { userId } },
        category: { connect: { categoryId } },
        show: data.show ?? createShow,
        includeInStatistics: data.includeInStatistics ?? true
      }
    });
  }
}
