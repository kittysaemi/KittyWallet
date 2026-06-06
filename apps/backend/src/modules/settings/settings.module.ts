import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma.module";
import { GetSettingsUseCase } from "./application/use-cases/get-settings.use-case";
import { UpdateSettingsUseCase } from "./application/use-cases/update-settings.use-case";
import { SettingsRepository } from "./infrastructure/settings.repository";
import { SettingsController } from "./presentation/settings.controller";

@Module({
  imports: [PrismaModule],
  controllers: [SettingsController],
  providers: [SettingsRepository, GetSettingsUseCase, UpdateSettingsUseCase]
})
export class SettingsModule {}
