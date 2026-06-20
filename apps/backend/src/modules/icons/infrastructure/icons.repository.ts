import { Injectable } from "@nestjs/common";
import { Icon, IconAssetSnapshot, IconDictionary, Prisma } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";

export type IconWithDictionary = Icon & { iconDictionary: IconDictionary & { snapshot: IconAssetSnapshot | null } };

@Injectable()
export class IconsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyForUser(userId: bigint, show?: boolean): Promise<IconWithDictionary[]> {
    return this.prisma.icon.findMany({
      where: {
        OR: [{ isDefault: true }, { userId }],
        ...(show === undefined ? {} : { show })
      },
      include: { iconDictionary: { include: { snapshot: true } }, },
      orderBy: [{ isDefault: "desc" }, { iconId: "asc" }]
    });
  }

  findAvailableIconByDictionaryId(userId: bigint, iconDictionaryId: bigint): Promise<Icon | null> {
    return this.prisma.icon.findFirst({
      where: {
        iconDictionaryId,
        OR: [{ isDefault: true }, { userId }]
      }
    });
  }

  findEditableIcon(iconId: bigint, userId: bigint): Promise<IconWithDictionary | null> {
    return this.prisma.icon.findFirst({
      where: {
        iconId,
        userId,
        isDefault: false
      },
      include: { iconDictionary: { include: { snapshot: true } } }
    });
  }

  createUserIcon(data: Prisma.IconCreateInput): Promise<Icon> {
    return this.prisma.icon.create({ data });
  }

  updateIcon(iconId: bigint, data: Prisma.IconUpdateInput): Promise<Icon> {
    return this.prisma.icon.update({
      where: { iconId },
      data
    });
  }

  findDictionaryByIconCode(iconCode: string): Promise<IconDictionary | null> {
    return this.prisma.iconDictionary.findUnique({
      where: { iconCode }
    });
  }

  findDictionaryByProvider(providerType: string, providerKey: string): Promise<IconDictionary | null> {
    return this.prisma.iconDictionary.findUnique({
      where: {
        providerType_providerKey: {
          providerType,
          providerKey
        }
      }
    });
  }

  searchDictionaries(keyword: string): Promise<IconDictionary[]> {
    return this.prisma.iconDictionary.findMany({
      where: {
        searchKeywords: {
          has: keyword
        }
      },
      orderBy: { iconDictionaryId: "asc" },
      take: 24
    });
  }

  upsertDictionary(data: {
    iconCode: string;
    providerType: string;
    providerKey: string;
    searchKeywords: string[];
  }): Promise<IconDictionary> {
    return this.prisma.iconDictionary.upsert({
      where: {
        providerType_providerKey: {
          providerType: data.providerType,
          providerKey: data.providerKey
        }
      },
      update: {
        iconCode: data.iconCode,
        searchKeywords: data.searchKeywords
      },
      create: data
    });
  }

  upsertSnapshot(data: Prisma.IconAssetSnapshotCreateInput): Promise<IconAssetSnapshot> {
    return this.prisma.iconAssetSnapshot.upsert({
      where: { snapshotHash: data.snapshotHash },
      update: {},
      create: data
    });
  }

  attachSnapshot(iconDictionaryId: bigint, snapshotHash: string, providerVersion: string): Promise<IconDictionary> {
    return this.prisma.iconDictionary.update({
      where: { iconDictionaryId },
      data: { snapshotHash, providerVersion }
    });
  }
}
