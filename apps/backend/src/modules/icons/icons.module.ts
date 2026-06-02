import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma.module";
import { ICON_PROVIDER_ADAPTER } from "./application/icon-provider.adapter";
import { IconsService } from "./application/icons.service";
import { IconsRepository } from "./infrastructure/icons.repository";
import { LucideIconProviderAdapter } from "./infrastructure/lucide-icon-provider.adapter";
import { IconOptionsController, IconsController } from "./presentation/icons.controller";

@Module({
  imports: [PrismaModule],
  controllers: [IconOptionsController, IconsController],
  providers: [
    IconsRepository,
    IconsService,
    LucideIconProviderAdapter,
    {
      provide: ICON_PROVIDER_ADAPTER,
      useExisting: LucideIconProviderAdapter
    }
  ]
})
export class IconsModule {}
