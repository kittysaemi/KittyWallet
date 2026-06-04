import { Module } from "@nestjs/common";
import { StatisticsService } from "./application/statistics.service";
import { StatisticsRepository } from "./infrastructure/statistics.repository";
import { StatisticsController } from "./presentation/statistics.controller";

@Module({
  controllers: [StatisticsController],
  providers: [StatisticsService, StatisticsRepository]
})
export class StatisticsModule {}
