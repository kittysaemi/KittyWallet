ALTER TABLE "ICON_DICTIONARY"
  ADD COLUMN "provider_version" TEXT,
  ADD COLUMN "snapshot_hash" TEXT;

CREATE TABLE "ICON_ASSET_SNAPSHOT" (
  "snapshot_hash" TEXT NOT NULL,
  "provider_type" TEXT NOT NULL,
  "snapshot_format" TEXT NOT NULL,
  "snapshot_payload" TEXT NOT NULL,
  "source_provider_key" TEXT NOT NULL,
  "source_provider_version" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ICON_ASSET_SNAPSHOT_pkey" PRIMARY KEY ("snapshot_hash")
);

CREATE INDEX "ICON_ASSET_SNAPSHOT_provider_type_idx" ON "ICON_ASSET_SNAPSHOT"("provider_type");
CREATE INDEX "ICON_DICTIONARY_snapshot_hash_idx" ON "ICON_DICTIONARY"("snapshot_hash");
ALTER TABLE "ICON_DICTIONARY" ADD CONSTRAINT "ICON_DICTIONARY_snapshot_hash_fkey" FOREIGN KEY ("snapshot_hash") REFERENCES "ICON_ASSET_SNAPSHOT"("snapshot_hash") ON DELETE SET NULL ON UPDATE CASCADE;
