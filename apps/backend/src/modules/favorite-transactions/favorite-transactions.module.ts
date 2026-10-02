import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma.module";
import { FavoriteTransactionsService } from "./application/favorite-transactions.service";
import { FavoriteTransactionsRepository } from "./infrastructure/favorite-transactions.repository";
import { FavoriteTransactionsController } from "./presentation/favorite-transactions.controller";

@Module({
  imports: [PrismaModule],
  controllers: [FavoriteTransactionsController],
  providers: [FavoriteTransactionsRepository, FavoriteTransactionsService]
})
export class FavoriteTransactionsModule {}
