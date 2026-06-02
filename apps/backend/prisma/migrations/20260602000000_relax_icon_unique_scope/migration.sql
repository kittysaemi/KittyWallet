DROP INDEX IF EXISTS "ICON_icon_value_is_default_key";

CREATE INDEX IF NOT EXISTS "ICON_icon_value_is_default_idx"
ON "ICON"("icon_value", "is_default");
