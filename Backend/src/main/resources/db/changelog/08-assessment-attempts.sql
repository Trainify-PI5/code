-- liquibase formatted sql

-- changeset trainify:08-assessment-attempts
-- Tentativas de avaliacao: ate agora a nota era calculada, mostrada e descartada,
-- e uma segunda tentativa quebrava na restricao UNIQUE(enrollment_id, question_id).

ALTER TABLE assessments ADD COLUMN IF NOT EXISTS max_attempts INT NOT NULL DEFAULT 3;

CREATE TABLE IF NOT EXISTS assessment_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    enrollment_id UUID NOT NULL REFERENCES enrollments(id),
    assessment_id UUID NOT NULL REFERENCES assessments(id),
    attempt_number INT NOT NULL,
    score INT NOT NULL,
    passed BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(enrollment_id, assessment_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS idx_attempts_enrollment_assessment
    ON assessment_attempts(enrollment_id, assessment_id);
CREATE INDEX IF NOT EXISTS idx_attempts_tenant ON assessment_attempts(tenant_id);

ALTER TABLE assessment_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON assessment_attempts
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Cada resposta passa a pertencer a uma tentativa
ALTER TABLE user_assessment_answers
    ADD COLUMN IF NOT EXISTS attempt_id UUID REFERENCES assessment_attempts(id);

ALTER TABLE user_assessment_answers
    DROP CONSTRAINT IF EXISTS user_assessment_answers_enrollment_id_question_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_answer_attempt_question
    ON user_assessment_answers(attempt_id, question_id);
