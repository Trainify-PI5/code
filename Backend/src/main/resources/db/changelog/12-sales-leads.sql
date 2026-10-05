-- liquibase formatted sql

-- changeset trainify:12-sales-leads
CREATE TABLE sales_leads (
    id UUID PRIMARY KEY,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL,
    phone VARCHAR(16) NOT NULL,
    company VARCHAR(160) NOT NULL,
    job_title VARCHAR(100) NOT NULL,
    company_size VARCHAR(16) NOT NULL,
    message VARCHAR(2000),
    status VARCHAR(16) NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'CLOSED')),
    consent_at TIMESTAMPTZ NOT NULL,
    consent_version VARCHAR(40) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX sales_leads_created_at_idx ON sales_leads (created_at DESC, id);
