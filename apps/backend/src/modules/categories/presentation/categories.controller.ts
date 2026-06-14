import { Body, Controller, Get, Param, Post, Put, Query } from "@nestjs/common";
import { CurrentUser, JwtPayload } from "../../../common/decorators/current-user.decorator";
import { CategoriesService } from "../application/categories.service";
import { CategoryListQueryDto } from "./dto/request/category-list-query.dto";
import { CreateCategoryRequestDto } from "./dto/request/create-category-request.dto";
import { UpdateCategoryRequestDto } from "./dto/request/update-category-request.dto";

@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  getCategories(@CurrentUser() user: JwtPayload, @Query() query: CategoryListQueryDto) {
    return this.categoriesService.getCategories(
      BigInt(user.sub),
      query.show === undefined ? undefined : query.show === "true"
    );
  }

  @Post()
  createCategory(@CurrentUser() user: JwtPayload, @Body() dto: CreateCategoryRequestDto) {
    return this.categoriesService.createCategory({
      userId: BigInt(user.sub),
      categoryName: dto.category_name,
      iconId: BigInt(dto.icon_id),
      show: dto.show
    });
  }

  @Put(":id")
  updateCategory(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateCategoryRequestDto
  ) {
    return this.categoriesService.updateCategory({
      categoryId: BigInt(id),
      userId: BigInt(user.sub),
      categoryName: dto.category_name,
      iconId: dto.icon_id === undefined ? undefined : BigInt(dto.icon_id),
      show: dto.show,
      includeInStatistics: dto.include_in_statistics
    });
  }
}
