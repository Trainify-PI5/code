-- liquibase formatted sql

-- changeset trainify:11-allow-unscored-certifications
ALTER TABLE certifications ALTER COLUMN score DROP NOT NULL;
