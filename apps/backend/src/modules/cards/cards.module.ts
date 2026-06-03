import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma.module";
import { CardsService } from "./application/cards.service";
import { CardsRepository } from "./infrastructure/cards.repository";
import { CardsController } from "./presentation/cards.controller";

@Module({
  imports: [PrismaModule],
  controllers: [CardsController],
  providers: [CardsRepository, CardsService]
})
export class CardsModule {}
