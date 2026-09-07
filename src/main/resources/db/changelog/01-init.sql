-- 1. Extensões Obrigatórias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Esquema Físico (Tabelas)

-- 2.1. tenants (Raiz — Sem RLS)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    domain VARCHAR(100) UNIQUE,
    primary_color VARCHAR(7) DEFAULT '#4B2C92',
    secondary_color VARCHAR(7) DEFAULT '#9D84B7',
    logo_url VARCHAR(500),
    max_users INT DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- 2.2. users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('ADMIN','MANAGER','INSTRUCTOR','STUDENT')),
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    version_id INT NOT NULL DEFAULT 0,
    UNIQUE(tenant_id, email)
);

-- 2.3. courses
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    instructor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    version_id INT NOT NULL DEFAULT 0
);

-- 2.4. enrollments
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    course_id UUID NOT NULL REFERENCES courses(id),
    progress_percentage INT DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    status VARCHAR(30) DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS','COMPLETED','CANCELLED')),
    enrolled_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(tenant_id, user_id, course_id)
);

-- 2.5. Estrutura do Curso (modules, lessons, assessments)
CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- Note: media_assets is referenced by lessons, so it should be created before lessons OR the FK added later.
-- Creating media_assets first:
CREATE TABLE media_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    course_id UUID REFERENCES courses(id),
    s3_key VARCHAR(500) NOT NULL UNIQUE,
    original_filename VARCHAR(255),
    mime_type VARCHAR(50) NOT NULL,
    file_size BIGINT,
    duration_seconds INT,
    transcription_status VARCHAR(30) DEFAULT 'PENDING' CHECK (transcription_status IN ('PENDING','PROCESSING','COMPLETED','FAILED')),
    subtitles_url VARCHAR(1000),
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    video_asset_id UUID REFERENCES media_assets(id),
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    title VARCHAR(200),
    passing_score INT NOT NULL DEFAULT 70 CHECK (passing_score BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(tenant_id, lesson_id)
);

CREATE TABLE assessment_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(30) DEFAULT 'MULTIPLE_CHOICE' CHECK (question_type IN ('MULTIPLE_CHOICE','TRUE_FALSE')),
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE assessment_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    question_id UUID NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE user_assessment_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    enrollment_id UUID NOT NULL REFERENCES enrollments(id),
    question_id UUID NOT NULL REFERENCES assessment_questions(id),
    selected_option_id UUID REFERENCES assessment_options(id),
    is_correct BOOLEAN NOT NULL,
    answered_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(enrollment_id, question_id)
);

-- 2.6. Acompanhamento e Certificações
CREATE TABLE lesson_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    enrollment_id UUID NOT NULL REFERENCES enrollments(id),
    lesson_id UUID NOT NULL REFERENCES lessons(id),
    status VARCHAR(30) DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED','IN_PROGRESS','COMPLETED')),
    watched_seconds INT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(enrollment_id, lesson_id)
);

CREATE TABLE certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    course_id UUID NOT NULL REFERENCES courses(id),
    score INT NOT NULL,
    issued_at TIMESTAMPTZ DEFAULT now(),
    certificate_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(tenant_id, user_id, course_id)
);

-- 2.7. Fórum/Discussão
CREATE TABLE forum_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    course_id UUID NOT NULL REFERENCES courses(id),
    author_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE forum_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    thread_id UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- 2.8. Notificações e Auditoria
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200),
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    reference_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    action_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.9. Tabelas de IA
CREATE TABLE ai_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    title VARCHAR(200),
    course_id UUID REFERENCES courses(id),
    source_type VARCHAR(30) DEFAULT 'TRANSCRIPTION',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ai_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    document_id UUID NOT NULL REFERENCES ai_documents(id) ON DELETE CASCADE,
    content_chunk TEXT NOT NULL,
    embedding VECTOR(1536) NOT NULL
);

-- 3. Row-Level Security (RLS)

-- Habilitar RLS em todas as tabelas (exceto tenants)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_assessment_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_embeddings ENABLE ROW LEVEL SECURITY;

-- Criar policies genéricas de isolamento
DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN 
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name NOT IN ('tenants', 'databasechangelog', 'databasechangeloglock') 
        AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format(
            'CREATE POLICY tenant_isolation_policy ON %I FOR ALL USING (tenant_id = current_setting(''app.current_tenant_id'', true)::UUID)', 
            t_name
        );
    END LOOP;
END
$$;

-- 4. Índices de Alta Performance
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_courses_tenant ON courses(tenant_id);
CREATE INDEX idx_enrollments_tenant ON enrollments(tenant_id);
CREATE INDEX idx_enroll_user_course ON enrollments(user_id, course_id);
CREATE INDEX idx_modules_course ON modules(course_id);
CREATE INDEX idx_lessons_module ON lessons(module_id);
CREATE INDEX idx_assessments_lesson ON assessments(lesson_id);
CREATE INDEX idx_questions_assessment ON assessment_questions(assessment_id);
CREATE INDEX idx_lesson_progress_enrollment ON lesson_progress(enrollment_id);
CREATE INDEX idx_certifications_user_course ON certifications(user_id, course_id);
CREATE INDEX idx_forum_threads_course ON forum_threads(course_id);
CREATE INDEX idx_forum_posts_thread ON forum_posts(thread_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_activity_logs_tenant_date ON activity_logs(tenant_id, created_at DESC);
CREATE INDEX idx_media_course ON media_assets(course_id);
CREATE INDEX idx_ai_embeddings_vector ON ai_embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_ai_embeddings_tenant ON ai_embeddings(tenant_id);
CREATE INDEX idx_ai_documents_course ON ai_documents(course_id);
