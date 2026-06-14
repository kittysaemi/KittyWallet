-- AlterTable
ALTER TABLE "CATEGORY_USER_SETTING"
ADD COLUMN "include_in_statistics" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "CATEGORY_USER_SETTING_include_in_statistics_idx"
ON "CATEGORY_USER_SETTING"("include_in_statistics");
