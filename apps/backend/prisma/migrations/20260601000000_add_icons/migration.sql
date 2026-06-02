CREATE TABLE "ICON" (
    "icon_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT,
    "icon_value" TEXT NOT NULL,
    "show" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ICON_pkey" PRIMARY KEY ("icon_id")
);

CREATE UNIQUE INDEX "ICON_icon_value_is_default_key" ON "ICON"("icon_value", "is_default");
CREATE UNIQUE INDEX "ICON_user_id_icon_value_key" ON "ICON"("user_id", "icon_value");
CREATE INDEX "ICON_user_id_idx" ON "ICON"("user_id");
CREATE INDEX "ICON_show_idx" ON "ICON"("show");
CREATE INDEX "ICON_is_default_idx" ON "ICON"("is_default");

ALTER TABLE "ICON" ADD CONSTRAINT "ICON_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "USER"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
