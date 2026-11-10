--liquibase formatted sql
--changeset trainify:17-ia-trechos-das-aulas
-- Texto das aulas preparado para a IA. Cada aula (texto escrito, transcricao e
-- PDF anexado) e dividida em trechos; o chat busca os trechos que tem a ver com a
-- pergunta e manda so eles para a LLM, que tem limite de tokens por pedido.
--
-- A busca e a busca textual do proprio PostgreSQL, com o dicionario de portugues
-- (ignora palavras como "de", "o", "que" e reduz "treinamentos" e "treinar" ao
-- mesmo radical). Nao precisa de servico de embeddings nem de banco vetorial.
CREATE TABLE ai_lesson_chunks (
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    search TSVECTOR GENERATED ALWAYS AS (to_tsvector('portuguese', content)) STORED,
    PRIMARY KEY (lesson_id, chunk_index)
);
CREATE INDEX ai_lesson_chunks_search ON ai_lesson_chunks USING GIN (search);

-- Uma linha por aula ja preparada, mesmo sem texto (aula so de video): assim a
-- preparacao das aulas antigas nao volta a baixar o mesmo PDF a cada rodada.
CREATE TABLE ai_lesson_index (
    lesson_id UUID PRIMARY KEY REFERENCES lessons(id) ON DELETE CASCADE,
    chunk_count INTEGER NOT NULL,
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
