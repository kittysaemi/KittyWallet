-- Migration: Remove UserStatus enum and related columns from USER table
-- Existing WITHDRAWN/INACTIVE users: delete their records to satisfy NOT NULL constraints being removed

-- Step 1: Delete data for non-ACTIVE users (WITHDRAWN or INACTIVE) in FK order
DELETE FROM "SYNC_HISTORY" WHERE user_id IN (SELECT user_id FROM "USER" WHERE status != 'ACTIVE');
DELETE FROM "TRANSACTION" WHERE user_id IN (SELECT user_id FROM "USER" WHERE status != 'ACTIVE');
DELETE FROM "CATEGORY_USER_SETTING" WHERE user_id IN (SELECT user_id FROM "USER" WHERE status != 'ACTIVE');
DELETE FROM "USER_SETTING" WHERE user_id IN (SELECT user_id FROM "USER" WHERE status != 'ACTIVE');
DELETE FROM "ACCOUNT" WHERE user_id IN (SELECT user_id FROM "USER" WHERE status != 'ACTIVE');
DELETE FROM "CARD" WHERE user_id IN (SELECT user_id FROM "USER" WHERE status != 'ACTIVE');
DELETE FROM "CATEGORY" WHERE user_id IN (SELECT user_id FROM "USER" WHERE status != 'ACTIVE') AND is_default = false;
DELETE FROM "ICON" WHERE user_id IN (SELECT user_id FROM "USER" WHERE status != 'ACTIVE') AND is_default = false;
DELETE FROM "SYNC_CLIENT" WHERE user_id IN (SELECT user_id FROM "USER" WHERE status != 'ACTIVE');
DELETE FROM "REFRESH_TOKEN" WHERE user_id IN (SELECT user_id FROM "USER" WHERE status != 'ACTIVE');
DELETE FROM "USER" WHERE status != 'ACTIVE';

-- Step 2: Drop status and withdrawn_at columns
ALTER TABLE "USER" DROP COLUMN IF EXISTS "status";
ALTER TABLE "USER" DROP COLUMN IF EXISTS "withdrawn_at";

-- Step 3: Drop UserStatus enum
DROP TYPE IF EXISTS "UserStatus";
