import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma.module";
import { TransactionsModule } from "../transactions/transactions.module";
import { SyncService } from "./application/sync.service";
import { SyncController } from "./presentation/sync.controller";

@Module({
  imports: [PrismaModule, TransactionsModule],
  controllers: [SyncController],
  providers: [SyncService]
})
export class SyncModule {}
