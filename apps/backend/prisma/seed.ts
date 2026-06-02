import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultIcons = [
  "tag",
  "wallet",
  "credit-card",
  "shopping-bag",
  "bus",
  "utensils",
  "heart-pulse",
  "graduation-cap",
  "music",
  "receipt",
  "repeat",
  "circle-dollar-sign"
];

const toIconCode = (providerKey: string): string => `icon-${providerKey}`;

async function main(): Promise<void> {
  for (const providerKey of defaultIcons) {
    const dictionary = await prisma.iconDictionary.upsert({
      where: {
        providerType_providerKey: {
          providerType: "lucide",
          providerKey
        }
      },
      update: {
        iconCode: toIconCode(providerKey),
        searchKeywords: [providerKey]
      },
      create: {
        iconCode: toIconCode(providerKey),
        providerType: "lucide",
        providerKey,
        searchKeywords: [providerKey]
      }
    });

    const existing = await prisma.icon.findFirst({
      where: {
        iconDictionaryId: dictionary.iconDictionaryId,
        isDefault: true
      }
    });

    if (existing) {
      await prisma.icon.update({
        where: { iconId: existing.iconId },
        data: { show: true }
      });
      continue;
    }

    await prisma.icon.create({
      data: {
        iconDictionary: { connect: { iconDictionaryId: dictionary.iconDictionaryId } },
        isDefault: true,
        show: true
      }
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
