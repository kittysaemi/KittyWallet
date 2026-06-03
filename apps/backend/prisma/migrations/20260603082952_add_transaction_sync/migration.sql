-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "WalletType" AS ENUM ('ACCOUNT', 'CARD');

-- CreateEnum
CREATE TYPE "SyncAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "SyncResult" AS ENUM ('SUCCESS', 'FAILED', 'CONFLICT');

-- CreateTable
CREATE TABLE "SYNC_CLIENT" (
    "sync_client_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "client_id" TEXT NOT NULL,
    "device_name" TEXT,
    "platform" TEXT,
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SYNC_CLIENT_pkey" PRIMARY KEY ("sync_client_id")
);

-- CreateTable
CREATE TABLE "TRANSACTION" (
    "transaction_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "category_id" BIGINT NOT NULL,
    "wallet_id" BIGINT NOT NULL,
    "sync_client_id" BIGINT,
    "client_temp_id" TEXT,
    "transaction_type" "TransactionType" NOT NULL,
    "wallet_type" "WalletType" NOT NULL,
    "amount" DECIMAL(15,0) NOT NULL,
    "transaction_date" DATE NOT NULL,
    "memo" VARCHAR(200),
    "deleted_yn" BOOLEAN NOT NULL DEFAULT false,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TRANSACTION_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateTable
CREATE TABLE "SYNC_HISTORY" (
    "sync_history_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "sync_client_id" BIGINT NOT NULL,
    "transaction_id" BIGINT,
    "client_temp_id" TEXT,
    "sync_action" "SyncAction" NOT NULL,
    "sync_result" "SyncResult" NOT NULL,
    "error_message" TEXT,
    "server_applied_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SYNC_HISTORY_pkey" PRIMARY KEY ("sync_history_id")
);

-- CreateIndex
CREATE INDEX "SYNC_CLIENT_user_id_idx" ON "SYNC_CLIENT"("user_id");

-- CreateIndex
CREATE INDEX "SYNC_CLIENT_client_id_idx" ON "SYNC_CLIENT"("client_id");

-- CreateIndex
CREATE INDEX "SYNC_CLIENT_last_synced_at_idx" ON "SYNC_CLIENT"("last_synced_at");

-- CreateIndex
CREATE UNIQUE INDEX "SYNC_CLIENT_user_id_client_id_key" ON "SYNC_CLIENT"("user_id", "client_id");

-- CreateIndex
CREATE INDEX "TRANSACTION_user_id_idx" ON "TRANSACTION"("user_id");

-- CreateIndex
CREATE INDEX "TRANSACTION_transaction_date_idx" ON "TRANSACTION"("transaction_date");

-- CreateIndex
CREATE INDEX "TRANSACTION_category_id_idx" ON "TRANSACTION"("category_id");

-- CreateIndex
CREATE INDEX "TRANSACTION_wallet_id_idx" ON "TRANSACTION"("wallet_id");

-- CreateIndex
CREATE INDEX "TRANSACTION_wallet_type_idx" ON "TRANSACTION"("wallet_type");

-- CreateIndex
CREATE INDEX "TRANSACTION_transaction_type_idx" ON "TRANSACTION"("transaction_type");

-- CreateIndex
CREATE INDEX "TRANSACTION_client_temp_id_idx" ON "TRANSACTION"("client_temp_id");

-- CreateIndex
CREATE INDEX "TRANSACTION_sync_client_id_idx" ON "TRANSACTION"("sync_client_id");

-- CreateIndex
CREATE INDEX "TRANSACTION_synced_at_idx" ON "TRANSACTION"("synced_at");

-- CreateIndex
CREATE INDEX "TRANSACTION_deleted_yn_idx" ON "TRANSACTION"("deleted_yn");

-- CreateIndex
CREATE UNIQUE INDEX "TRANSACTION_user_id_sync_client_id_client_temp_id_key" ON "TRANSACTION"("user_id", "sync_client_id", "client_temp_id");

-- CreateIndex
CREATE INDEX "SYNC_HISTORY_user_id_idx" ON "SYNC_HISTORY"("user_id");

-- CreateIndex
CREATE INDEX "SYNC_HISTORY_sync_client_id_idx" ON "SYNC_HISTORY"("sync_client_id");

-- CreateIndex
CREATE INDEX "SYNC_HISTORY_transaction_id_idx" ON "SYNC_HISTORY"("transaction_id");

-- CreateIndex
CREATE INDEX "SYNC_HISTORY_client_temp_id_idx" ON "SYNC_HISTORY"("client_temp_id");

-- CreateIndex
CREATE INDEX "SYNC_HISTORY_sync_result_idx" ON "SYNC_HISTORY"("sync_result");

-- CreateIndex
CREATE INDEX "SYNC_HISTORY_server_applied_at_idx" ON "SYNC_HISTORY"("server_applied_at");

-- AddForeignKey
ALTER TABLE "SYNC_CLIENT" ADD CONSTRAINT "SYNC_CLIENT_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "USER"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TRANSACTION" ADD CONSTRAINT "TRANSACTION_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "USER"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TRANSACTION" ADD CONSTRAINT "TRANSACTION_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "CATEGORY"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TRANSACTION" ADD CONSTRAINT "TRANSACTION_sync_client_id_fkey" FOREIGN KEY ("sync_client_id") REFERENCES "SYNC_CLIENT"("sync_client_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SYNC_HISTORY" ADD CONSTRAINT "SYNC_HISTORY_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "USER"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SYNC_HISTORY" ADD CONSTRAINT "SYNC_HISTORY_sync_client_id_fkey" FOREIGN KEY ("sync_client_id") REFERENCES "SYNC_CLIENT"("sync_client_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SYNC_HISTORY" ADD CONSTRAINT "SYNC_HISTORY_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "TRANSACTION"("transaction_id") ON DELETE SET NULL ON UPDATE CASCADE;
