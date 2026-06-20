-- CreateTable
CREATE TABLE "CARD_INSTALLMENT" (
    "installment_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "card_id" BIGINT NOT NULL,
    "category_id" BIGINT NOT NULL,
    "original_amount" DECIMAL(15,0) NOT NULL,
    "installment_months" INTEGER NOT NULL,
    "purchase_date" DATE NOT NULL,
    "memo" VARCHAR(200),
    "deleted_yn" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CARD_INSTALLMENT_pkey" PRIMARY KEY ("installment_id")
);

-- AlterTable
ALTER TABLE "TRANSACTION"
ADD COLUMN "installment_id" BIGINT,
ADD COLUMN "installment_seq" INTEGER,
ADD COLUMN "installment_total_count" INTEGER;

-- CreateIndex
CREATE INDEX "CARD_INSTALLMENT_user_id_idx" ON "CARD_INSTALLMENT"("user_id");

-- CreateIndex
CREATE INDEX "CARD_INSTALLMENT_card_id_idx" ON "CARD_INSTALLMENT"("card_id");

-- CreateIndex
CREATE INDEX "CARD_INSTALLMENT_category_id_idx" ON "CARD_INSTALLMENT"("category_id");

-- CreateIndex
CREATE INDEX "CARD_INSTALLMENT_purchase_date_idx" ON "CARD_INSTALLMENT"("purchase_date");

-- CreateIndex
CREATE INDEX "CARD_INSTALLMENT_deleted_yn_idx" ON "CARD_INSTALLMENT"("deleted_yn");

-- CreateIndex
CREATE INDEX "TRANSACTION_installment_id_idx" ON "TRANSACTION"("installment_id");

-- AddForeignKey
ALTER TABLE "CARD_INSTALLMENT" ADD CONSTRAINT "CARD_INSTALLMENT_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "USER"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CARD_INSTALLMENT" ADD CONSTRAINT "CARD_INSTALLMENT_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "CARD"("card_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CARD_INSTALLMENT" ADD CONSTRAINT "CARD_INSTALLMENT_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "CATEGORY"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TRANSACTION" ADD CONSTRAINT "TRANSACTION_installment_id_fkey" FOREIGN KEY ("installment_id") REFERENCES "CARD_INSTALLMENT"("installment_id") ON DELETE SET NULL ON UPDATE CASCADE;
