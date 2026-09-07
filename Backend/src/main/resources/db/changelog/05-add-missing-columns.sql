-- liquibase formatted sql
-- changeset system:5

ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS subtitles_url VARCHAR(1000);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar VARCHAR(500);
