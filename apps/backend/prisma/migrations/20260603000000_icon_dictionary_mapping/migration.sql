CREATE TABLE "ICON_DICTIONARY" (
    "icon_dictionary_id" BIGSERIAL NOT NULL,
    "icon_code" TEXT NOT NULL,
    "provider_type" TEXT NOT NULL,
    "provider_key" TEXT NOT NULL,
    "search_keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ICON_DICTIONARY_pkey" PRIMARY KEY ("icon_dictionary_id")
);

INSERT INTO "ICON_DICTIONARY" ("icon_code", "provider_type", "provider_key", "search_keywords", "updated_at")
SELECT DISTINCT
    CONCAT('icon-', "icon_value"),
    'lucide',
    "icon_value",
    ARRAY["icon_value"]::TEXT[],
    CURRENT_TIMESTAMP
FROM "ICON";

ALTER TABLE "ICON" ADD COLUMN "icon_dictionary_id" BIGINT;

UPDATE "ICON"
SET "icon_dictionary_id" = "ICON_DICTIONARY"."icon_dictionary_id"
FROM "ICON_DICTIONARY"
WHERE "ICON_DICTIONARY"."provider_type" = 'lucide'
  AND "ICON_DICTIONARY"."provider_key" = "ICON"."icon_value";

DROP INDEX IF EXISTS "ICON_user_id_icon_value_key";
DROP INDEX IF EXISTS "ICON_icon_value_is_default_key";
DROP INDEX IF EXISTS "ICON_icon_value_is_default_idx";

ALTER TABLE "ICON" ALTER COLUMN "icon_dictionary_id" SET NOT NULL;
ALTER TABLE "ICON" DROP COLUMN "icon_value";

CREATE UNIQUE INDEX "ICON_DICTIONARY_icon_code_key" ON "ICON_DICTIONARY"("icon_code");
CREATE UNIQUE INDEX "ICON_DICTIONARY_provider_type_provider_key_key" ON "ICON_DICTIONARY"("provider_type", "provider_key");
CREATE INDEX "ICON_DICTIONARY_provider_type_idx" ON "ICON_DICTIONARY"("provider_type");
CREATE UNIQUE INDEX "ICON_user_id_icon_dictionary_id_key" ON "ICON"("user_id", "icon_dictionary_id");
CREATE INDEX "ICON_icon_dictionary_id_idx" ON "ICON"("icon_dictionary_id");

ALTER TABLE "ICON" ADD CONSTRAINT "ICON_icon_dictionary_id_fkey" FOREIGN KEY ("icon_dictionary_id") REFERENCES "ICON_DICTIONARY"("icon_dictionary_id") ON DELETE RESTRICT ON UPDATE CASCADE;
