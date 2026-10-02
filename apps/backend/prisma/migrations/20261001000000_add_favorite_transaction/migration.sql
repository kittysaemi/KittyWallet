-- CreateTable
CREATE TABLE "FAVORITE_TRANSACTION" (
    "favorite_transaction_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "category_id" BIGINT NOT NULL,
    "wallet_id" BIGINT NOT NULL,
    "transaction_type" "TransactionType" NOT NULL,
    "wallet_type" "WalletType" NOT NULL,
    "amount" DECIMAL(15,0) NOT NULL,
    "memo" VARCHAR(200),
    "deleted_yn" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FAVORITE_TRANSACTION_pkey" PRIMARY KEY ("favorite_transaction_id")
);

-- CreateIndex
CREATE INDEX "FAVORITE_TRANSACTION_user_id_idx" ON "FAVORITE_TRANSACTION"("user_id");

-- CreateIndex
CREATE INDEX "FAVORITE_TRANSACTION_deleted_yn_idx" ON "FAVORITE_TRANSACTION"("deleted_yn");

-- AddForeignKey
ALTER TABLE "FAVORITE_TRANSACTION" ADD CONSTRAINT "FAVORITE_TRANSACTION_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "USER"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FAVORITE_TRANSACTION" ADD CONSTRAINT "FAVORITE_TRANSACTION_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "CATEGORY"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;
