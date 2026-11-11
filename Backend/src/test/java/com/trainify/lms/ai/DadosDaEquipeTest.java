package com.trainify.lms.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.trainify.lms.ai.EquipeRepository.Matricula;

class DadosDaEquipeTest {

    private final UUID nr35 = UUID.randomUUID();
    private final UUID epi = UUID.randomUUID();
    private final UUID ana = UUID.randomUUID();
    private final UUID bruno = UUID.randomUUID();
    private final UUID carla = UUID.randomUUID();
    private final LocalDate hoje = LocalDate.of(2026, 11, 10);

    private final List<Matricula> matriculas = List.of(
            matricula(ana, "Ana Souza", nr35, "NR-35: Trabalho em Altura", "IN_PROGRESS", 3, 12, 80, false),
            matricula(bruno, "Bruno Lima", nr35, "NR-35: Trabalho em Altura", "COMPLETED", 12, 12, 95, true),
            matricula(carla, "Carla Dias", nr35, "NR-35: Trabalho em Altura", "IN_PROGRESS", 0, 12, null, false),
            matricula(ana, "Ana Souza", epi, "Uso de EPI", "COMPLETED", 5, 5, 70, true));

    @Test
    void reconhecePerguntasSobrePessoas() {
        assertTrue(DadosDaEquipe.sobrePessoas("Quem ainda não concluiu o curso?"));
        assertTrue(DadosDaEquipe.sobrePessoas("Qual a nota média da equipe?"));
        assertTrue(DadosDaEquipe.sobrePessoas("Tem alguém atrasado?"));
        assertTrue(DadosDaEquipe.sobrePessoas("Como está o progresso dos colaboradores?"));
        assertFalse(DadosDaEquipe.sobrePessoas("Quem fornece o EPI?"));
        assertFalse(DadosDaEquipe.sobrePessoas("O que é trabalho em altura?"));
    }

    @Test
    void resumoPorCursoEUmaLinhaPorPessoa() {
        String texto = DadosDaEquipe.montar(matriculas, Set.of(), Set.of(), hoje, 5000);

        assertTrue(texto.startsWith("DADOS DA EQUIPE (do sistema do Trainify, hoje 10/11/2026):"));
        assertTrue(texto.contains("Curso NR-35: Trabalho em Altura: 3 matriculados, 1 concluíram, 1 em andamento, 1 não começaram; "
                + "progresso médio 42%; nota média 88 (de 2 que fizeram avaliação); 1 certificados emitidos"), texto);
        assertTrue(texto.contains("- Ana Souza: em andamento, 3 de 12 aulas (25%), melhor nota 80"));
        assertTrue(texto.contains("- Carla Dias: não começou, 0 de 12 aulas (0%), sem avaliação feita"));
        assertTrue(texto.contains("- Bruno Lima: concluiu em 09/11/2026, 12 de 12 aulas (100%), melhor nota 95, certificado emitido"));
        assertFalse(texto.contains("parciais"));
    }

    /** A LLM erra contas com datas: os dias vao calculados. */
    @Test
    void diasSemAtividadeVaoCalculados() {
        String texto = DadosDaEquipe.montar(matriculas, Set.of(), Set.of(), hoje, 5000);

        assertTrue(texto.contains("Ana Souza: em andamento, 3 de 12 aulas (25%), melhor nota 80, "
                + "última atividade 05/11/2026 (há 5 dias), matrícula 01/11/2026 (há 9 dias)"), texto);
        assertTrue(texto.contains("Carla Dias: não começou, 0 de 12 aulas (0%), sem avaliação feita, nenhuma atividade"));
        assertEquals(" (há 1 dia)", DadosDaEquipe.haDias(Instant.parse("2026-11-09T15:00:00Z"), hoje));
        assertEquals(" (hoje)", DadosDaEquipe.haDias(Instant.parse("2026-11-10T15:00:00Z"), hoje));
    }

    @Test
    void nomeCitadoNaPerguntaFiltraAPessoa() {
        Set<UUID> citados = DadosDaEquipe.alunosCitados(matriculas, "Como está a Ana?");
        assertEquals(Set.of(ana), citados);

        String texto = DadosDaEquipe.montar(matriculas, citados, Set.of(), hoje, 5000);
        assertTrue(texto.contains("Ana Souza"));
        assertFalse(texto.contains("Bruno Lima"));
        assertTrue(texto.contains("Curso Uso de EPI:"), "a Ana aparece em todos os cursos dela");
    }

    @Test
    void cursoCitadoPeloCodigoOuPorUmaPalavraDoTitulo() {
        assertEquals(Set.of(nr35), DadosDaEquipe.cursosCitados(matriculas, "Quem concluiu a NR35?"));
        assertEquals(Set.of(nr35), DadosDaEquipe.cursosCitados(matriculas, "progresso no curso de nr-35"));
        assertEquals(Set.of(nr35), DadosDaEquipe.cursosCitados(matriculas, "e no de altura?"));
        assertTrue(DadosDaEquipe.cursosCitados(matriculas, "Quem está atrasado?").isEmpty());
    }

    @Test
    void particulaDoNomeNaoContaComoCitacao() {
        List<Matricula> comDos = List.of(matricula(UUID.randomUUID(), "Maria dos Santos", nr35, "NR-35", "IN_PROGRESS", 1, 2, null, false));
        assertTrue(DadosDaEquipe.alunosCitados(comDos, "Quais dos alunos concluíram?").isEmpty());
    }

    /** Empresa grande: o resumo sempre vai, e as pessoas que precisam de atencao vem primeiro. */
    @Test
    void foraDoOrcamentoMostraQuemPrecisaDeAtencaoEAvisa() {
        List<Matricula> muitas = new ArrayList<>();
        for (int i = 0; i < 200; i++) {
            boolean concluiu = i % 2 == 0;
            muitas.add(matricula(UUID.randomUUID(), "Pessoa " + i, nr35, "NR-35", concluiu ? "COMPLETED" : "IN_PROGRESS",
                    concluiu ? 10 : i % 10, 10, null, false));
        }

        String texto = DadosDaEquipe.montar(muitas, Set.of(), Set.of(), hoje, 3000);

        assertTrue(texto.length() <= 3400, "passou muito do orçamento: " + texto.length());
        assertTrue(texto.contains("Curso NR-35: 200 matriculados, 100 concluíram"));
        assertTrue(texto.contains("Dados parciais: mostrando"));
        assertFalse(texto.contains("concluiu em"), "quem já concluiu fica por último");
    }

    @Test
    void soConsultaOBancoParaQuemAcompanhaCursosESoIncluiQuandoAPerguntaESobrePessoas() {
        EquipeRepository repositorio = mock(EquipeRepository.class);
        DadosDaEquipe dados = new DadosDaEquipe(repositorio);

        assertNull(dados.paraPergunta(Set.of(), "Quem não concluiu?"));
        verify(repositorio, never()).matriculas(any());

        when(repositorio.matriculas(any())).thenReturn(matriculas);
        assertNull(dados.paraPergunta(Set.of(nr35), "O que é trabalho em altura?"));
        assertTrue(dados.paraPergunta(Set.of(nr35), "Quem não concluiu?").contains("DADOS DA EQUIPE"));
        assertTrue(dados.paraPergunta(Set.of(nr35), "E o Bruno?").contains("Bruno Lima"), "nome citado basta");
    }

    private static Matricula matricula(UUID aluno, String nome, UUID curso, String titulo, String status,
            int feitas, int total, Integer nota, boolean certificado) {
        Instant matricula = Instant.parse("2026-11-01T12:00:00Z");
        Instant fim = "COMPLETED".equals(status) ? Instant.parse("2026-11-09T12:00:00Z") : null;
        Instant atividade = feitas == 0 ? null : Instant.parse("2026-11-05T12:00:00Z");
        return new Matricula(aluno, nome, curso, titulo, status, matricula, fim, total, feitas, atividade, nota, certificado);
    }
}
