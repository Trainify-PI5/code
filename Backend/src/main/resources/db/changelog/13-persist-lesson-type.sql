-- liquibase formatted sql

-- changeset trainify:13-persist-lesson-type
ALTER TABLE lessons ADD COLUMN lesson_type VARCHAR(16)
    CHECK (lesson_type IN ('VIDEO', 'DOCUMENT', 'ARTICLE', 'QUIZ'));
