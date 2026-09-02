ALTER TABLE "TRANSACTION" ADD COLUMN "transfer_group_id" TEXT;

CREATE INDEX "TRANSACTION_transfer_group_id_idx" ON "TRANSACTION"("transfer_group_id");
