import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma.module";
import { CategoriesService } from "./application/categories.service";
import { CategoriesRepository } from "./infrastructure/categories.repository";
import { CategoriesController } from "./presentation/categories.controller";

@Module({
  imports: [PrismaModule],
  controllers: [CategoriesController],
  providers: [CategoriesRepository, CategoriesService]
})
export class CategoriesModule {}
