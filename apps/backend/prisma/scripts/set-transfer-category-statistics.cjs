const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const TRANSFER_CATEGORY_NAME = "계좌금액이동";

async function main() {
  const categories = await prisma.category.findMany({
    where: { categoryName: TRANSFER_CATEGORY_NAME, userId: { not: null } }
  });

  if (categories.length === 0) {
    console.log(`No user-created "${TRANSFER_CATEGORY_NAME}" category found. Nothing to do.`);
    return;
  }

  for (const category of categories) {
    const setting = await prisma.categoryUserSetting.upsert({
      where: {
        userId_categoryId: {
          userId: category.userId,
          categoryId: category.categoryId
        }
      },
      update: { includeInStatistics: false },
      create: {
        user: { connect: { userId: category.userId } },
        category: { connect: { categoryId: category.categoryId } },
        show: true,
        includeInStatistics: false
      }
    });

    console.log(
      `userId=${setting.userId} categoryId=${setting.categoryId} includeInStatistics=${setting.includeInStatistics}`
    );
  }

  console.log(`Done. Updated ${categories.length} categoryUserSetting row(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
