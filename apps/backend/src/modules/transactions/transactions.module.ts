import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma.module";
import { TransactionsService } from "./application/transactions.service";
import { TransactionsRepository } from "./infrastructure/transactions.repository";
import { TransactionsController } from "./presentation/transactions.controller";

@Module({
  imports: [PrismaModule],
  controllers: [TransactionsController],
  providers: [TransactionsRepository, TransactionsService],
  exports: [TransactionsService]
})
export class TransactionsModule {}
