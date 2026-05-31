import { Controller, Get, Header } from "@nestjs/common";
import type { HealthStatus } from "@kittywallet/shared-types";
import { PrismaService } from "../../database/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  getHealth(): HealthStatus {
    return {
      status: "ok",
      timestamp: new Date().toISOString()
    };
  }

  @Get("db")
  @Header("Cache-Control", "no-store")
  async getDatabaseHealth(): Promise<HealthStatus & { database: "ok" }> {
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      status: "ok",
      database: "ok",
      timestamp: new Date().toISOString()
    };
  }
}
