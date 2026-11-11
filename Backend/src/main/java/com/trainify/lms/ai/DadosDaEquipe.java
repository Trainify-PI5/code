package com.trainify.lms.ai;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

import com.trainify.lms.ai.EquipeRepository.Matricula;

import lombok.RequiredArgsConstructor;

/**
 * Monta o bloco "DADOS DA EQUIPE" que vai junto com a pergunta de gestores e
 * instrutores: o andamento real dos alunos, tirado do banco. A LLM so le e
 * explica esses numeros; quem decide de quais cursos eles saem e o
 * {@link AiCourseScope}.
 *
 * <p>Nada aqui usa a LLM. Os dados so entram quando a pergunta e sobre pessoas
 * (alunos, progresso, notas...) ou cita o nome de alguem, para nao gastar o
 * limite de tokens em perguntas sobre o conteudo.
 */
@Component
@RequiredArgsConstructor
public class DadosDaEquipe {

    /** ~1.400 tokens: cabe junto com o material e o historico no limite por minuto da Groq. */
    static final int MAX_CARACTERES = 5000;

    static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");
    private static final DateTimeFormatter DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /** Assuntos que indicam uma pergunta sobre as pessoas, nao sobre o conteudo. */
    private static final Pattern SOBRE_PESSOAS = Pattern.compile(
            "\\b(alun[oa]s?|colaborador\\w*|funcionari\\w*|equipe|turma|pessoas?|progresso|andamento"
                    + "|desempenho|notas?|medias?|aprovad\\w*|reprovad\\w*|atrasad\\w*|parad[oa]s?|pendente\\w*"
                    + "|matricul\\w*|inscrit\\w*|certificad\\w*|certificado\\w*|conclu\\w*|terminou|terminaram"
                    + "|ranking|engajamento|inativ\\w*|participa\\w*|frequencia|evolucao)\\b");

    /** Partes de nome que tambem sao palavras comuns ("Maria dos Santos" x "quais dos alunos"). */
    private static final Set<String> PARTICULAS = Set.of("dos", "das", "del", "van", "von", "der");

    private final EquipeRepository repository;

    /**
     * @param cursos  cursos cujos alunos a pessoa pode acompanhar
     * @param consulta pergunta (com a anterior, se for de seguimento)
     * @return o bloco para o prompt, ou null se a pergunta nao e sobre pessoas
     */
    public String paraPergunta(Collection<UUID> cursos, String consulta) {
        if (cursos.isEmpty() || consulta == null || consulta.isBlank()) {
            return null;
        }
        List<Matricula> matriculas = repository.matriculas(cursos);
        if (matriculas.isEmpty()) {
            return sobrePessoas(consulta)
                    ? "DADOS DA EQUIPE: ninguém está matriculado nos cursos que você acompanha."
                    : null;
        }
        Set<UUID> citados = alunosCitados(matriculas, consulta);
        if (!sobrePessoas(consulta) && citados.isEmpty()) {
            return null;
        }
        return montar(matriculas, citados, cursosCitados(matriculas, consulta), LocalDate.now(FUSO), MAX_CARACTERES);
    }

    static boolean sobrePessoas(String texto) {
        return SOBRE_PESSOAS.matcher(normalizar(texto)).find();
    }

    // ── filtros ──

    /** Alunos cujo nome (ou um dos nomes, como "Ana") aparece na pergunta. */
    static Set<UUID> alunosCitados(List<Matricula> matriculas, String consulta) {
        Set<String> palavras = palavras(consulta);
        Set<UUID> citados = new HashSet<>();
        for (Matricula m : matriculas) {
            for (String parte : palavras(m.aluno())) {
                if (parte.length() >= 3 && !PARTICULAS.contains(parte) && palavras.contains(parte)) {
                    citados.add(m.alunoId());
                    break;
                }
            }
        }
        return citados;
    }

    /**
     * Cursos citados na pergunta: por uma palavra marcante do titulo (5 letras ou
     * mais) ou por um codigo com numero, como "NR-35" (comparado como "nr35").
     */
    static Set<UUID> cursosCitados(List<Matricula> matriculas, String consulta) {
        Set<String> palavras = palavras(consulta.replace("-", ""));
        Set<UUID> citados = new HashSet<>();
        Map<UUID, String> titulos = new LinkedHashMap<>();
        matriculas.forEach(m -> titulos.putIfAbsent(m.cursoId(), m.curso()));
        titulos.forEach((id, titulo) -> {
            for (String parte : palavras(titulo.replace("-", ""))) {
                boolean marcante = parte.length() >= 5 || (parte.length() >= 3 && parte.matches(".*\\d.*"));
                if (marcante && palavras.contains(parte)) {
                    citados.add(id);
                    break;
                }
            }
        });
        return citados;
    }

    // ── texto ──

    static String montar(List<Matricula> todas, Set<UUID> alunos, Set<UUID> cursos, LocalDate hoje, int orcamento) {
        List<Matricula> escolhidas = todas.stream()
                .filter(m -> alunos.isEmpty() || alunos.contains(m.alunoId()))
                .filter(m -> cursos.isEmpty() || cursos.contains(m.cursoId()))
                .toList();
        if (escolhidas.isEmpty()) {
            // Ex.: a pessoa citada nao esta em nenhum dos cursos citados
            escolhidas = alunos.isEmpty() ? todas
                    : todas.stream().filter(m -> alunos.contains(m.alunoId())).toList();
        }

        StringBuilder texto = new StringBuilder("DADOS DA EQUIPE (do sistema do Trainify, hoje ")
                .append(DATA.format(hoje)).append("):\n");

        // Resumo de cada curso primeiro: ele sempre cabe e responde as perguntas gerais
        Map<String, List<Matricula>> porCurso = new LinkedHashMap<>();
        escolhidas.forEach(m -> porCurso.computeIfAbsent(m.curso(), c -> new ArrayList<>()).add(m));
        porCurso.forEach((curso, lista) -> texto.append(resumo(curso, lista)).append('\n'));

        // Depois as pessoas, com quem mais precisa de atencao primeiro, ate o orcamento
        List<Matricula> ordem = new ArrayList<>(escolhidas);
        ordem.sort(Comparator.comparing(Matricula::concluida)
                .thenComparingInt(Matricula::progresso)
                .thenComparing(m -> m.ultimaAtividade() == null ? Instant.EPOCH : m.ultimaAtividade()));
        List<Matricula> cabem = new ArrayList<>();
        int tamanho = texto.length();
        for (Matricula m : ordem) {
            int linha = linha(m, hoje).length() + m.curso().length() + 10;
            if (tamanho + linha > orcamento) {
                break;
            }
            cabem.add(m);
            tamanho += linha;
        }

        texto.append("\nPOR PESSOA:\n");
        Map<String, List<Matricula>> pessoasPorCurso = new LinkedHashMap<>();
        porCurso.keySet().forEach(curso -> pessoasPorCurso.put(curso, new ArrayList<>()));
        cabem.forEach(m -> pessoasPorCurso.get(m.curso()).add(m));
        pessoasPorCurso.forEach((curso, lista) -> {
            if (lista.isEmpty()) {
                return;
            }
            texto.append("Curso ").append(curso).append(":\n");
            lista.sort(Comparator.comparing(Matricula::aluno, String.CASE_INSENSITIVE_ORDER));
            lista.forEach(m -> texto.append("- ").append(linha(m, hoje)).append('\n'));
        });
        if (cabem.size() < escolhidas.size()) {
            texto.append("(Dados parciais: mostrando ").append(cabem.size()).append(" de ").append(escolhidas.size())
                    .append(" matrículas, priorizando quem ainda não concluiu. Para ver o resto, a pessoa pode")
                    .append(" perguntar sobre um curso ou um aluno específico.)\n");
        }
        return texto.toString();
    }

    static String resumo(String curso, List<Matricula> lista) {
        long concluidas = lista.stream().filter(Matricula::concluida).count();
        long semComecar = lista.stream().filter(m -> !m.concluida() && m.aulasConcluidas() == 0).count();
        int mediaProgresso = (int) Math.round(lista.stream().mapToInt(Matricula::progresso).average().orElse(0));
        List<Integer> notas = lista.stream().map(Matricula::melhorNota).filter(n -> n != null).toList();
        long certificados = lista.stream().filter(Matricula::certificado).count();

        StringBuilder r = new StringBuilder("Curso ").append(curso).append(": ")
                .append(lista.size()).append(lista.size() == 1 ? " matriculado, " : " matriculados, ")
                .append(concluidas).append(" concluíram, ")
                .append(lista.size() - concluidas - semComecar).append(" em andamento, ")
                .append(semComecar).append(" não começaram; progresso médio ").append(mediaProgresso).append('%');
        if (!notas.isEmpty()) {
            r.append("; nota média ").append(Math.round(notas.stream().mapToInt(Integer::intValue).average().orElse(0)))
                    .append(" (de ").append(notas.size()).append(" que fizeram avaliação)");
        }
        return r.append("; ").append(certificados).append(" certificados emitidos").toString();
    }

    static String linha(Matricula m, LocalDate hoje) {
        StringBuilder l = new StringBuilder(m.aluno()).append(": ");
        if (m.concluida()) {
            l.append("concluiu");
            if (m.concluidoEm() != null) {
                l.append(" em ").append(data(m.concluidoEm()));
            }
        } else if (m.aulasConcluidas() == 0) {
            l.append("não começou");
        } else {
            l.append("em andamento");
        }
        l.append(", ").append(Math.min(m.aulasConcluidas(), m.totalAulas())).append(" de ").append(m.totalAulas())
                .append(" aulas (").append(m.progresso()).append("%)");
        l.append(m.melhorNota() == null ? ", sem avaliação feita" : ", melhor nota " + m.melhorNota());
        if (m.certificado()) {
            l.append(", certificado emitido");
        }
        // Os dias vao calculados: a LLM erra contas com datas
        if (m.ultimaAtividade() != null) {
            l.append(", última atividade ").append(data(m.ultimaAtividade())).append(haDias(m.ultimaAtividade(), hoje));
        } else if (!m.concluida()) {
            l.append(", nenhuma atividade");
        }
        if (m.matriculaEm() != null) {
            l.append(", matrícula ").append(data(m.matriculaEm())).append(haDias(m.matriculaEm(), hoje));
        }
        return l.toString();
    }

    private static String data(Instant instante) {
        return DATA.format(instante.atZone(FUSO));
    }

    static String haDias(Instant instante, LocalDate hoje) {
        long dias = java.time.temporal.ChronoUnit.DAYS.between(instante.atZone(FUSO).toLocalDate(), hoje);
        if (dias <= 0) {
            return " (hoje)";
        }
        return dias == 1 ? " (há 1 dia)" : " (há " + dias + " dias)";
    }

    private static String normalizar(String texto) {
        return TextoIa.semAcento(texto == null ? "" : texto.toLowerCase(Locale.ROOT));
    }

    private static Set<String> palavras(String texto) {
        Set<String> palavras = new HashSet<>();
        for (String p : normalizar(texto).split("[^\\p{L}\\p{N}]+")) {
            if (!p.isBlank()) {
                palavras.add(p);
            }
        }
        return palavras;
    }
}
