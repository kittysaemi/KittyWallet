-- Drop unique constraints so that deleted accounts/cards can share names with new ones.
-- Duplicate name validation is enforced at the application level (deletedYn: false filter).

ALTER TABLE "ACCOUNT" DROP CONSTRAINT IF EXISTS "ACCOUNT_user_id_account_name_key";
ALTER TABLE "CARD"    DROP CONSTRAINT IF EXISTS "CARD_user_id_card_name_key";

-- Add plain indexes to keep query performance for name lookups.
CREATE INDEX IF NOT EXISTS "ACCOUNT_user_id_account_name_idx" ON "ACCOUNT"("user_id", "account_name");
CREATE INDEX IF NOT EXISTS "CARD_user_id_card_name_idx"       ON "CARD"("user_id", "card_name");
