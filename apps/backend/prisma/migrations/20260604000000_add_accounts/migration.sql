-- CreateTable
CREATE TABLE "ACCOUNT" (
    "account_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "icon_id" BIGINT NOT NULL,
    "account_name" VARCHAR(50) NOT NULL,
    "initial_balance" DECIMAL(15,0) NOT NULL,
    "current_balance" DECIMAL(15,0) NOT NULL,
    "use_yn" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ACCOUNT_pkey" PRIMARY KEY ("account_id")
);

-- CreateIndex
CREATE INDEX "ACCOUNT_user_id_idx" ON "ACCOUNT"("user_id");

-- CreateIndex
CREATE INDEX "ACCOUNT_use_yn_idx" ON "ACCOUNT"("use_yn");

-- CreateIndex
CREATE UNIQUE INDEX "ACCOUNT_user_id_account_name_key" ON "ACCOUNT"("user_id", "account_name");

-- AddForeignKey
ALTER TABLE "ACCOUNT" ADD CONSTRAINT "ACCOUNT_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "USER"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ACCOUNT" ADD CONSTRAINT "ACCOUNT_icon_id_fkey" FOREIGN KEY ("icon_id") REFERENCES "ICON"("icon_id") ON DELETE RESTRICT ON UPDATE CASCADE;
