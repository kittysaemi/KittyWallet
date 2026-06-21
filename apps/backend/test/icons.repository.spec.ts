import { PrismaService } from "../src/database/prisma.service";
import { IconsRepository } from "../src/modules/icons/infrastructure/icons.repository";

describe("IconsRepository.deleteUnusedIcons", () => {
  const iconId = BigInt(12);
  const dictionaryId = BigInt(10);
  const userId = BigInt(1);
  const tx = {
    icon: {
      findMany: jest.fn(),
      deleteMany: jest.fn()
    },
    iconDictionary: {
      findMany: jest.fn(),
      deleteMany: jest.fn()
    },
    iconAssetSnapshot: {
      findMany: jest.fn(),
      deleteMany: jest.fn()
    }
  };
  const prisma = {
    $transaction: jest.fn(async (callback: (transaction: typeof tx) => Promise<bigint[]>) => callback(tx))
  } as unknown as PrismaService;
  const repository = new IconsRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    tx.icon.findMany.mockResolvedValue([{ iconId, iconDictionaryId: dictionaryId }]);
    tx.icon.deleteMany.mockResolvedValue({ count: 1 });
    tx.iconDictionary.deleteMany.mockResolvedValue({ count: 1 });
    tx.iconAssetSnapshot.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("deletes a snapshot after deleting its last dictionary reference", async () => {
    tx.iconDictionary.findMany.mockResolvedValue([{ iconDictionaryId: dictionaryId, snapshotHash: "snapshot-solo" }]);
    tx.iconAssetSnapshot.findMany.mockResolvedValue([{ snapshotHash: "snapshot-solo" }]);

    await expect(repository.deleteUnusedIcons(userId, [iconId])).resolves.toEqual([iconId]);

    expect(tx.iconDictionary.deleteMany).toHaveBeenCalledWith({
      where: { iconDictionaryId: { in: [dictionaryId] } }
    });
    expect(tx.iconAssetSnapshot.deleteMany).toHaveBeenCalledWith({
      where: { snapshotHash: { in: ["snapshot-solo"] } }
    });
  });

  it("keeps a snapshot when another dictionary still references it", async () => {
    tx.iconDictionary.findMany.mockResolvedValue([{ iconDictionaryId: dictionaryId, snapshotHash: "snapshot-shared" }]);
    tx.iconAssetSnapshot.findMany.mockResolvedValue([]);

    await repository.deleteUnusedIcons(userId, [iconId]);

    expect(tx.iconDictionary.deleteMany).toHaveBeenCalled();
    expect(tx.iconAssetSnapshot.deleteMany).not.toHaveBeenCalled();
  });
});
