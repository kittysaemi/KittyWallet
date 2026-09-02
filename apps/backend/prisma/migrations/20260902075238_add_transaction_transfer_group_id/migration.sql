-- AlterTable
ALTER TABLE "TRANSACTION" ADD COLUMN     "transfer_group_id" TEXT;

-- CreateIndex
CREATE INDEX "TRANSACTION_transfer_group_id_idx" ON "TRANSACTION"("transfer_group_id");
