-- liquibase formatted sql
-- changeset joao:2
ALTER TABLE forum_threads ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE forum_posts ADD COLUMN deleted_at TIMESTAMPTZ;
