import { Test } from "@nestjs/testing";
import { HealthController } from "../src/modules/health/health.controller";
import { PrismaService } from "../src/database/prisma.service";

describe("HealthController", () => {
  const prisma = {
    $queryRaw: jest.fn()
  };

  let controller: HealthController;

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    prisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);

    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prisma }]
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("returns the API health status", () => {
    expect(controller.getHealth()).toEqual({
      status: "ok",
      timestamp: "2026-01-01T00:00:00.000Z"
    });
  });

  it("checks database connectivity", async () => {
    await expect(controller.getDatabaseHealth()).resolves.toEqual({
      status: "ok",
      database: "ok",
      timestamp: "2026-01-01T00:00:00.000Z"
    });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });
});
