--liquibase formatted sql
--changeset trainify:14-company-invitations
CREATE TABLE company_invitations (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'INSTRUCTOR', 'STUDENT')),
    token_hash VARCHAR(64) UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version_id INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX company_invitations_pending_email ON company_invitations (lower(email))
    WHERE accepted_at IS NULL AND revoked_at IS NULL;
CREATE INDEX company_invitations_tenant ON company_invitations (tenant_id, created_at);
