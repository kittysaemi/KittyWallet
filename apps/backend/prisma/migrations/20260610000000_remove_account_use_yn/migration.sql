-- AlterTable
ALTER TABLE "ACCOUNT" DROP COLUMN "use_yn";

-- DropIndex
DROP INDEX IF EXISTS "ACCOUNT_use_yn_idx";
