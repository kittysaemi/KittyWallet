import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma.module";
import { AccountsService } from "./application/accounts.service";
import { AccountsRepository } from "./infrastructure/accounts.repository";
import { AccountsController } from "./presentation/accounts.controller";

@Module({
  imports: [PrismaModule],
  controllers: [AccountsController],
  providers: [AccountsRepository, AccountsService]
})
export class AccountsModule {}
