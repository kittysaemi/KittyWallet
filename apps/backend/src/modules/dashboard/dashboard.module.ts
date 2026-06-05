import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma.module";
import { DashboardService } from "./application/dashboard.service";
import { DashboardRepository } from "./infrastructure/dashboard.repository";
import { DashboardController } from "./presentation/dashboard.controller";

@Module({
  imports: [PrismaModule],
  controllers: [DashboardController],
  providers: [DashboardRepository, DashboardService]
})
export class DashboardModule {}
