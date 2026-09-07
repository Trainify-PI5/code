-- liquibase formatted sql

-- changeset antigravity:add-media-provider
ALTER TABLE media_assets ADD COLUMN provider VARCHAR(50) DEFAULT 'S3';
ALTER TABLE media_assets ADD COLUMN external_url VARCHAR(1000);

-- Drop constraints safely
ALTER TABLE media_assets ALTER COLUMN s3_key DROP NOT NULL;
ALTER TABLE media_assets DROP CONSTRAINT IF EXISTS media_assets_s3_key_key;
