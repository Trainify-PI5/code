--liquibase formatted sql
--changeset trainify:16-course-generation-drafts
-- Rascunhos de curso gerados pela IA a partir dos documentos enviados pelo
-- instrutor. A proposta fica aqui ate ser aprovada (vira um curso DRAFT) ou descartada.
CREATE TABLE course_generation_drafts (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    created_by UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('PROCESSING', 'READY', 'FAILED', 'APPROVED', 'DISCARDED')),
    progress INTEGER NOT NULL DEFAULT 0,
    step VARCHAR(300),
    document_names JSONB,
    instructions VARCHAR(500),
    proposal JSONB,
    error VARCHAR(500),
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX course_generation_drafts_tenant ON course_generation_drafts (tenant_id, created_at);
