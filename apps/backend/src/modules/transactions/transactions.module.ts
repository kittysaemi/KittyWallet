import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma.module";
import { TransactionsService } from "./application/transactions.service";
import { TransferService } from "./application/transfer.service";
import { TransactionsRepository } from "./infrastructure/transactions.repository";
import { TransferRepository } from "./infrastructure/transfer.repository";
import { TransactionsController } from "./presentation/transactions.controller";
import { TransferController } from "./presentation/transfer.controller";

@Module({
  imports: [PrismaModule],
  controllers: [TransferController, TransactionsController],
  providers: [TransactionsRepository, TransactionsService, TransferRepository, TransferService],
  exports: [TransactionsService, TransferService]
})
export class TransactionsModule {}
