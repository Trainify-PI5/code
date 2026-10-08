-- liquibase formatted sql

-- changeset trainify:15-email-por-empresa
-- O mesmo e-mail passa a poder existir em empresas diferentes: um consultor que
-- atende duas clientes precisa de uma conta em cada uma. A tabela users ja tem
-- UNIQUE(tenant_id, email); faltava soltar o convite, que era unico no sistema
-- inteiro.
DROP INDEX IF EXISTS company_invitations_pending_email;

CREATE UNIQUE INDEX company_invitations_pending_email
    ON company_invitations (tenant_id, lower(email))
    WHERE accepted_at IS NULL AND revoked_at IS NULL;
