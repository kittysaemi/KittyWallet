-- The original unique constraints were implemented as direct unique indexes (not constraint-backed).
-- DROP CONSTRAINT from the previous migration had no effect on them.
-- This migration drops the unique indexes directly.

DROP INDEX IF EXISTS "ACCOUNT_user_id_account_name_key";
DROP INDEX IF EXISTS "CARD_user_id_card_name_key";
