-- CreateTable
CREATE TABLE "CARD" (
    "card_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "icon_id" BIGINT NOT NULL,
    "card_name" VARCHAR(50) NOT NULL,
    "use_yn" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CARD_pkey" PRIMARY KEY ("card_id")
);

-- CreateIndex
CREATE INDEX "CARD_user_id_idx" ON "CARD"("user_id");

-- CreateIndex
CREATE INDEX "CARD_use_yn_idx" ON "CARD"("use_yn");

-- CreateIndex
CREATE UNIQUE INDEX "CARD_user_id_card_name_key" ON "CARD"("user_id", "card_name");

-- AddForeignKey
ALTER TABLE "CARD" ADD CONSTRAINT "CARD_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "USER"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CARD" ADD CONSTRAINT "CARD_icon_id_fkey" FOREIGN KEY ("icon_id") REFERENCES "ICON"("icon_id") ON DELETE RESTRICT ON UPDATE CASCADE;
