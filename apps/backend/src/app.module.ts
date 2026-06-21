import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./database/prisma.module";
import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { IconsModule } from "./modules/icons/icons.module";
import { CategoriesModule } from "./modules/categories/categories.module";
import { AccountsModule } from "./modules/accounts/accounts.module";
import { CardsModule } from "./modules/cards/cards.module";
import { TransactionsModule } from "./modules/transactions/transactions.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { StatisticsModule } from "./modules/statistics/statistics.module";
import { UsersModule } from "./modules/users/users.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { SyncModule } from "./modules/sync/sync.module";
import { ManifestModule } from "./modules/manifest/manifest.module";
import { ReceiptAnalysisModule } from "./modules/receipt-analysis/receipt-analysis.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { ApiResponseInterceptor } from "./common/interceptors/api-response.interceptor";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    IconsModule,
    CategoriesModule,
    AccountsModule,
    CardsModule,
    TransactionsModule,
    DashboardModule,
    StatisticsModule,
    UsersModule,
    SettingsModule,
    SyncModule,
    ManifestModule,
    ReceiptAnalysisModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiResponseInterceptor
    }
  ]
})
export class AppModule {}
