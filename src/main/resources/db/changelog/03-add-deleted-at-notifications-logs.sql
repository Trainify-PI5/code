-- liquibase formatted sql
-- changeset joao:3
ALTER TABLE notifications ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE activity_logs ADD COLUMN deleted_at TIMESTAMPTZ;
