const { PrismaClient } = require("@prisma/client");

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
  "circle-dollar-sign",
  "banknote-arrow-up",
  "sandwich"
];

const toIconCode = (providerKey) => `icon-${providerKey}`;

const defaultCategories = [
  { categoryName: "급여", providerKey: "circle-dollar-sign" },
  { categoryName: "수입", providerKey: "banknote-arrow-up" },
  { categoryName: "지출", providerKey: "tag" },
  { categoryName: "쇼핑", providerKey: "shopping-bag" },
  { categoryName: "교통비", providerKey: "bus" },
  { categoryName: "점심", providerKey: "sandwich" },
  { categoryName: "식비", providerKey: "utensils" },
  { categoryName: "의료", providerKey: "heart-pulse" },
  { categoryName: "교육", providerKey: "graduation-cap" },
  { categoryName: "문화", providerKey: "music" },
  { categoryName: "공과금", providerKey: "receipt" },
  { categoryName: "구독", providerKey: "repeat" },
  { categoryName: "기타지출", providerKey: "tag" }
];

async function main() {
  const defaultIconIds = new Map();

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
      const icon = await prisma.icon.update({
        where: { iconId: existing.iconId },
        data: { show: true }
      });
      defaultIconIds.set(providerKey, icon.iconId);
      continue;
    }

    const icon = await prisma.icon.create({
      data: {
        iconDictionary: { connect: { iconDictionaryId: dictionary.iconDictionaryId } },
        isDefault: true,
        show: true
      }
    });
    defaultIconIds.set(providerKey, icon.iconId);
  }

  for (const category of defaultCategories) {
    const iconId = defaultIconIds.get(category.providerKey);
    if (!iconId) {
      throw new Error(`Default icon is missing: ${category.providerKey}`);
    }

    const existing = await prisma.category.findFirst({
      where: {
        categoryName: category.categoryName,
        isDefault: true
      }
    });

    if (existing) {
      await prisma.category.update({
        where: { categoryId: existing.categoryId },
        data: { iconId, show: true }
      });
      continue;
    }

    await prisma.category.create({
      data: {
        categoryName: category.categoryName,
        iconId,
        isDefault: true,
        show: true
      }
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
