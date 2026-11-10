package com.trainify.lms.ai;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

/**
 * Os trechos das aulas que a IA usa como material (tabelas ai_lesson_chunks e
 * ai_lesson_index, criadas em 17-ia-trechos-das-aulas.sql).
 *
 * <p>SQL direto porque a busca usa recursos do PostgreSQL que o JPA nao expressa:
 * {@code to_tsquery('portuguese', ...)} e {@code ts_rank_cd}. Toda consulta junta
 * com aulas, modulos e cursos: o que for excluido some da busca na hora, e os
 * titulos vem sempre atualizados.
 */
@Repository
@RequiredArgsConstructor
public class TrechoRepository {

    private final NamedParameterJdbcTemplate jdbc;

    /** Um trecho de aula, com o curso e a aula de onde veio. */
    public record Trecho(UUID courseId, String courseTitle, UUID lessonId, String lessonTitle, int ordem, String texto,
            double nota) {

        public Trecho(UUID courseId, String courseTitle, UUID lessonId, String lessonTitle, int ordem, String texto) {
            this(courseId, courseTitle, lessonId, lessonTitle, ordem, texto, 0);
        }
    }

    /** Uma aula na lista de cursos e aulas que a pessoa pode consultar. */
    public record AulaDoCatalogo(String courseTitle, String moduleTitle, String lessonTitle) {}

    private static final String SELECT_TRECHOS = """
            SELECT c.id AS course_id, c.title AS course_title, l.id AS lesson_id, l.title AS lesson_title,
                   t.chunk_index, t.content, %s AS nota
            FROM ai_lesson_chunks t
            JOIN lessons l ON l.id = t.lesson_id AND l.deleted_at IS NULL
            JOIN modules m ON m.id = l.module_id AND m.deleted_at IS NULL
            JOIN courses c ON c.id = m.course_id AND c.deleted_at IS NULL
            """;

    // ── gravar ──

    /** Troca os trechos da aula pelos novos e registra que ela foi preparada. */
    @Transactional
    public void substituir(UUID lessonId, List<String> trechos) {
        jdbc.update("DELETE FROM ai_lesson_chunks WHERE lesson_id = :aula", Map.of("aula", lessonId));
        if (!trechos.isEmpty()) {
            MapSqlParameterSource[] linhas = new MapSqlParameterSource[trechos.size()];
            for (int i = 0; i < trechos.size(); i++) {
                linhas[i] = new MapSqlParameterSource()
                        .addValue("aula", lessonId)
                        .addValue("ordem", i)
                        .addValue("texto", trechos.get(i));
            }
            jdbc.batchUpdate("INSERT INTO ai_lesson_chunks (lesson_id, chunk_index, content) VALUES (:aula, :ordem, :texto)",
                    linhas);
        }
        jdbc.update("""
                INSERT INTO ai_lesson_index (lesson_id, chunk_count, indexed_at) VALUES (:aula, :total, now())
                ON CONFLICT (lesson_id) DO UPDATE SET chunk_count = EXCLUDED.chunk_count, indexed_at = now()
                """, Map.of("aula", lessonId, "total", trechos.size()));
    }

    @Transactional
    public void removerAula(UUID lessonId) {
        jdbc.update("DELETE FROM ai_lesson_chunks WHERE lesson_id = :aula", Map.of("aula", lessonId));
        jdbc.update("DELETE FROM ai_lesson_index WHERE lesson_id = :aula", Map.of("aula", lessonId));
    }

    /** O curso e excluido de forma logica (deleted_at): os trechos dele saem de vez aqui. */
    @Transactional
    public void removerCurso(UUID courseId) {
        String aulasDoCurso = "SELECT l.id FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = :curso";
        jdbc.update("DELETE FROM ai_lesson_chunks WHERE lesson_id IN (" + aulasDoCurso + ")", Map.of("curso", courseId));
        jdbc.update("DELETE FROM ai_lesson_index WHERE lesson_id IN (" + aulasDoCurso + ")", Map.of("curso", courseId));
    }

    // ── buscar ──

    /**
     * Busca textual em portugues nos trechos dos cursos informados (e, se vier,
     * so na aula informada). Os mais relevantes primeiro.
     *
     * @param consulta palavras ligadas por "|", como devolve {@link TextoIa#consultaTextual}
     */
    public List<Trecho> buscar(Collection<UUID> cursos, UUID aula, String consulta, int limite) {
        if (cursos.isEmpty() || consulta == null || consulta.isBlank()) {
            return List.of();
        }
        Map<String, Object> parametros = new HashMap<>();
        parametros.put("cursos", cursos);
        parametros.put("consulta", consulta);
        parametros.put("limite", limite);
        String filtroDaAula = "";
        if (aula != null) {
            filtroDaAula = " AND l.id = :aula";
            parametros.put("aula", aula);
        }
        return jdbc.query(SELECT_TRECHOS.formatted("ts_rank_cd(t.search, q)") + """
                CROSS JOIN to_tsquery('portuguese', :consulta) q
                WHERE c.id IN (:cursos) AND t.search @@ q""" + filtroDaAula + """

                ORDER BY ts_rank_cd(t.search, q) DESC, t.chunk_index
                LIMIT :limite
                """, parametros, TrechoRepository::trecho);
    }

    /** Os primeiros trechos da aula, na ordem do texto. */
    public List<Trecho> daAula(UUID aula, int limite) {
        return jdbc.query(SELECT_TRECHOS.formatted("0") + " WHERE l.id = :aula ORDER BY t.chunk_index LIMIT :limite",
                Map.of("aula", aula, "limite", limite), TrechoRepository::trecho);
    }

    /** Os trechos de todas as aulas do modulo, na ordem das aulas. */
    public List<Trecho> doModulo(UUID modulo, int limite) {
        return jdbc.query(SELECT_TRECHOS.formatted("0") + " WHERE m.id = :modulo ORDER BY l.order_index, t.chunk_index LIMIT :limite",
                Map.of("modulo", modulo, "limite", limite), TrechoRepository::trecho);
    }

    /** Cursos, modulos e aulas que a pessoa pode consultar (so os titulos). */
    public List<AulaDoCatalogo> catalogo(Collection<UUID> cursos, int limite) {
        if (cursos.isEmpty()) {
            return List.of();
        }
        return jdbc.query("""
                SELECT c.title AS course_title, m.title AS module_title, l.title AS lesson_title
                FROM courses c
                JOIN modules m ON m.course_id = c.id AND m.deleted_at IS NULL
                JOIN lessons l ON l.module_id = m.id AND l.deleted_at IS NULL
                WHERE c.id IN (:cursos) AND c.deleted_at IS NULL
                ORDER BY c.title, m.order_index, l.order_index
                LIMIT :limite
                """, Map.of("cursos", cursos, "limite", limite),
                (rs, i) -> new AulaDoCatalogo(rs.getString("course_title"), rs.getString("module_title"),
                        rs.getString("lesson_title")));
    }

    /** Aulas de cursos ativos que ainda nao passaram pela preparacao. */
    public List<UUID> aulasPendentes(int limite) {
        List<UUID> aulas = new ArrayList<>();
        jdbc.query("""
                SELECT l.id
                FROM lessons l
                JOIN modules m ON m.id = l.module_id AND m.deleted_at IS NULL
                JOIN courses c ON c.id = m.course_id AND c.deleted_at IS NULL
                LEFT JOIN ai_lesson_index i ON i.lesson_id = l.id
                WHERE l.deleted_at IS NULL AND i.lesson_id IS NULL
                LIMIT :limite
                """, Map.of("limite", limite), rs -> {
            aulas.add(rs.getObject("id", UUID.class));
        });
        return aulas;
    }

    private static Trecho trecho(ResultSet rs, int linha) throws SQLException {
        return new Trecho(
                rs.getObject("course_id", UUID.class),
                rs.getString("course_title"),
                rs.getObject("lesson_id", UUID.class),
                rs.getString("lesson_title"),
                rs.getInt("chunk_index"),
                rs.getString("content"),
                rs.getDouble("nota"));
    }
}
