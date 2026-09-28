-- liquibase formatted sql

-- changeset trainify:09-add-transcript
-- O webhook da IA ja recebia o texto da transcricao, mas nao havia onde guardar.
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS transcript TEXT;
