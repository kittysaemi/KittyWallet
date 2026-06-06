-- CreateTable
CREATE TABLE "USER_SETTING" (
    "setting_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "setting_key" VARCHAR(50) NOT NULL,
    "setting_value" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "USER_SETTING_pkey" PRIMARY KEY ("setting_id")
);

-- CreateIndex
CREATE INDEX "USER_SETTING_user_id_idx" ON "USER_SETTING"("user_id");

-- CreateIndex
CREATE INDEX "USER_SETTING_setting_key_idx" ON "USER_SETTING"("setting_key");

-- CreateIndex
CREATE UNIQUE INDEX "USER_SETTING_user_id_setting_key_key" ON "USER_SETTING"("user_id", "setting_key");

-- AddForeignKey
ALTER TABLE "USER_SETTING" ADD CONSTRAINT "USER_SETTING_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "USER"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
