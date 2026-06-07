ALTER TABLE "ACCOUNT" ADD COLUMN "deleted_yn" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CARD"    ADD COLUMN "deleted_yn" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "ACCOUNT_deleted_yn_idx" ON "ACCOUNT"("deleted_yn");
CREATE INDEX "CARD_deleted_yn_idx"    ON "CARD"("deleted_yn");
