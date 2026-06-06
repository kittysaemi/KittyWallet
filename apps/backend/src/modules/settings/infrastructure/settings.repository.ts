import { Injectable } from "@nestjs/common";
import { Prisma, UserSetting } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";

interface UpsertSettingInput {
  userId: bigint;
  settingKey: string;
  settingValue: Prisma.InputJsonValue;
}

@Injectable()
export class SettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(userId: bigint, settingKey?: string): Promise<UserSetting[]> {
    return this.prisma.userSetting.findMany({
      where: {
        userId,
        ...(settingKey === undefined ? {} : { settingKey })
      },
      orderBy: { settingKey: "asc" }
    });
  }

  async upsertMany(inputs: UpsertSettingInput[]): Promise<void> {
    await this.prisma.$transaction(
      inputs.map((input) =>
        this.prisma.userSetting.upsert({
          where: {
            userId_settingKey: {
              userId: input.userId,
              settingKey: input.settingKey
            }
          },
          create: {
            userId: input.userId,
            settingKey: input.settingKey,
            settingValue: input.settingValue
          },
          update: {
            settingValue: input.settingValue
          }
        })
      )
    );
  }
}
