package com.trainify.lms.ai;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import lombok.RequiredArgsConstructor;

/**
 * O andamento dos alunos nos cursos, em uma consulta so, para o assistente
 * responder perguntas de gestores e instrutores sobre a equipe.
 *
 * <p>Os numeros seguem a mesma conta da tela de Analises (AnalyticsService):
 * aulas concluidas sobre o total de aulas do curso e a melhor nota nas avaliacoes.
 */
@Repository
@RequiredArgsConstructor
public class EquipeRepository {

    /** Teto de seguranca: o texto enviado a LLM ainda passa por um orcamento menor. */
    static final int MAX_MATRICULAS = 2000;

    private final NamedParameterJdbcTemplate jdbc;

    /** Uma matricula de um aluno num curso, com o andamento dele. */
    public record Matricula(
            UUID alunoId, String aluno, UUID cursoId, String curso, String status,
            Instant matriculaEm, Instant concluidoEm, int totalAulas, int aulasConcluidas,
            Instant ultimaAtividade, Integer melhorNota, boolean certificado) {

        public int progresso() {
            if (totalAulas == 0) {
                return 0;
            }
            return (int) Math.round(Math.min(aulasConcluidas, totalAulas) * 100.0 / totalAulas);
        }

        public boolean concluida() {
            return "COMPLETED".equals(status);
        }
    }

    /** Matriculas ativas (nao canceladas) nos cursos informados. */
    public List<Matricula> matriculas(Collection<UUID> cursos) {
        if (cursos.isEmpty()) {
            return List.of();
        }
        return jdbc.query("""
                SELECT u.id AS aluno_id, u.name AS aluno, c.id AS curso_id, c.title AS curso, e.status,
                       e.enrolled_at, e.completed_at,
                       (SELECT count(*) FROM lessons l JOIN modules m ON m.id = l.module_id
                         WHERE m.course_id = c.id AND l.deleted_at IS NULL AND m.deleted_at IS NULL) AS total_aulas,
                       (SELECT count(*) FROM lesson_progress lp
                         WHERE lp.enrollment_id = e.id AND lp.status = 'COMPLETED' AND lp.deleted_at IS NULL) AS aulas_concluidas,
                       (SELECT max(lp.updated_at) FROM lesson_progress lp
                         WHERE lp.enrollment_id = e.id AND lp.deleted_at IS NULL) AS ultima_atividade,
                       (SELECT max(a.score) FROM assessment_attempts a
                         WHERE a.enrollment_id = e.id AND a.deleted_at IS NULL) AS melhor_nota,
                       EXISTS (SELECT 1 FROM certifications ce
                         WHERE ce.user_id = u.id AND ce.course_id = c.id AND ce.deleted_at IS NULL) AS certificado
                FROM enrollments e
                JOIN users u ON u.id = e.user_id AND u.deleted_at IS NULL
                JOIN courses c ON c.id = e.course_id AND c.deleted_at IS NULL
                WHERE e.course_id IN (:cursos) AND e.deleted_at IS NULL AND e.status <> 'CANCELLED'
                ORDER BY c.title, u.name
                LIMIT :limite
                """, Map.of("cursos", cursos, "limite", MAX_MATRICULAS), EquipeRepository::matricula);
    }

    private static Matricula matricula(ResultSet rs, int linha) throws SQLException {
        int valor = rs.getInt("melhor_nota");
        Integer nota = rs.wasNull() ? null : valor; // sem tentativa de avaliacao ainda
        return new Matricula(
                rs.getObject("aluno_id", UUID.class),
                rs.getString("aluno"),
                rs.getObject("curso_id", UUID.class),
                rs.getString("curso"),
                rs.getString("status"),
                instante(rs.getTimestamp("enrolled_at")),
                instante(rs.getTimestamp("completed_at")),
                rs.getInt("total_aulas"),
                rs.getInt("aulas_concluidas"),
                instante(rs.getTimestamp("ultima_atividade")),
                nota,
                rs.getBoolean("certificado"));
    }

    private static Instant instante(Timestamp t) {
        return t == null ? null : t.toInstant();
    }
}
