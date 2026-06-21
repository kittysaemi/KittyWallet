import { HttpStatus, Injectable } from "@nestjs/common";
import { Icon, IconAssetSnapshot, IconDictionary, Prisma } from "@prisma/client";
import { AppException } from "../../../common/exceptions/app.exception";
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

  findCleanupCandidates(userId: bigint): Promise<IconWithDictionary[]> {
    return this.prisma.icon.findMany({
      where: {
        userId,
        isDefault: false,
        accounts: { none: {} },
        cards: { none: {} },
        categories: { none: {} }
      },
      include: { iconDictionary: { include: { snapshot: true } } },
      orderBy: { iconId: "asc" }
    });
  }

  async deleteUnusedIcons(userId: bigint, iconIds: bigint[]): Promise<bigint[]> {
    return this.prisma.$transaction(async (tx) => {
      const icons = await tx.icon.findMany({
        where: {
          iconId: { in: iconIds },
          userId,
          isDefault: false,
          accounts: { none: {} },
          cards: { none: {} },
          categories: { none: {} }
        },
        select: { iconId: true, iconDictionaryId: true }
      });

      if (icons.length !== iconIds.length) {
        throw new AppException(
          "ICON_004",
          "선택한 아이콘 중 사용 중인 아이콘이 있어 삭제할 수 없습니다.",
          HttpStatus.CONFLICT
        );
      }

      await tx.icon.deleteMany({ where: { iconId: { in: iconIds } } });

      const dictionaryIds = icons.map((icon) => icon.iconDictionaryId);
      const unusedDictionaries = await tx.iconDictionary.findMany({
        where: {
          iconDictionaryId: { in: dictionaryIds },
          icons: { none: {} }
        },
        select: { iconDictionaryId: true, snapshotHash: true }
      });

      if (unusedDictionaries.length > 0) {
        await tx.iconDictionary.deleteMany({
          where: { iconDictionaryId: { in: unusedDictionaries.map((dictionary) => dictionary.iconDictionaryId) } }
        });

        const snapshotHashes = unusedDictionaries.flatMap((dictionary) =>
          dictionary.snapshotHash ? [dictionary.snapshotHash] : []
        );
        if (snapshotHashes.length > 0) {
          const unusedSnapshots = await tx.iconAssetSnapshot.findMany({
            where: {
              snapshotHash: { in: snapshotHashes },
              dictionaries: { none: {} }
            },
            select: { snapshotHash: true }
          });

          if (unusedSnapshots.length > 0) {
            await tx.iconAssetSnapshot.deleteMany({
              where: { snapshotHash: { in: unusedSnapshots.map((snapshot) => snapshot.snapshotHash) } }
            });
          }
        }
      }

      return icons.map((icon) => icon.iconId);
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
