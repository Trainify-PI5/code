-- liquibase formatted sql

-- changeset trainify:10-add-user-bio
ALTER TABLE users ADD COLUMN bio VARCHAR(1000);
