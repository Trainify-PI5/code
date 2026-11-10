package com.trainify.lms.ai;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Semaphore;
import java.util.function.Supplier;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trainify.lms.domain.entities.CourseGenerationDraft;
import com.trainify.lms.domain.entities.CourseGenerationDraft.Status;
import com.trainify.lms.repositories.CourseGenerationDraftRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Monta a proposta de curso a partir dos documentos enviados pelo instrutor.
 *
 * <ol>
 *   <li><b>Mapa do material</b> (sem LLM): amostras de cada documento, com a pagina.</li>
 *   <li><b>Estrutura</b> (1 chamada, JSON): titulo, modulos e aulas com os topicos.</li>
 *   <li><b>Aulas</b> (1 chamada por aula): para cada aula, os pedacos dos documentos
 *       que mais falam dos topicos dela vao para a LLM, que escreve o texto.</li>
 * </ol>
 *
 * <p>Roda em segundo plano, uma geracao por vez. O andamento fica no rascunho
 * (tabela course_generation_drafts), que a tela consulta. A conta gratuita da
 * Groq limita os tokens por minuto: quando o limite estoura, a geracao espera e
 * continua, em vez de falhar.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class GeradorDeCurso {

    static final int MAX_CARACTERES_MAPA = 9000;
    static final int MAX_CARACTERES_MATERIAL_AULA = 6000;
    static final int MAX_TENTATIVAS = 3;
    static final int MAX_ESPERAS_POR_LIMITE = 8;
    static final int MAX_AULAS_POR_MODULO = 6;
    private static final ObjectMapper JSON = new ObjectMapper();

    private final Llm llm;
    private final IaProperties props;
    private final CourseGenerationDraftRepository repository;

    private final Semaphore vaga = new Semaphore(1);
    private final Set<UUID> ativos = ConcurrentHashMap.newKeySet();

    /** Espera quando a Groq avisa que o limite por minuto acabou. Menor nos testes. */
    long esperaPorLimiteMs = 20_000;

    /** Um documento enviado, ja convertido em texto. PDFs tem uma entrada por pagina. */
    public record Documento(String nome, List<String> paginas, boolean pdf) {}

    /** Um pedaco de documento, com a pagina de onde saiu (null em .txt/.md). */
    record Pedaco(String documento, Integer pagina, String texto, int posicao) {}

    /** O instrutor descartou o rascunho enquanto a IA trabalhava. */
    static class Cancelada extends RuntimeException {
        Cancelada() {
            super("geracao cancelada");
        }
    }

    // ── controle ──

    public boolean configurada() {
        return llm.configurada();
    }

    /** Reserva a vez. So uma geracao por vez: o limite de tokens por minuto e da conta inteira. */
    public boolean reservar() {
        return vaga.tryAcquire();
    }

    /** Devolve a vez reservada quando a geracao nem chegou a comecar. */
    public void liberar() {
        vaga.release();
    }

    /** Marca o rascunho como em andamento antes de a tarefa em segundo plano comecar. */
    public void registrar(UUID rascunho) {
        ativos.add(rascunho);
    }

    /** Se o servidor reiniciar no meio, o rascunho fica "processando" sem ninguem gerando. */
    public boolean emAndamento(UUID rascunho) {
        return ativos.contains(rascunho);
    }

    // ── geracao ──

    @Async
    public void gerar(UUID rascunho, List<Documento> documentos, int minModulos, int maxModulos, String orientacao) {
        try {
            Map<String, Object> proposta = montar(rascunho, documentos, minModulos, maxModulos, orientacao);
            concluir(rascunho, proposta);
        } catch (Cancelada e) {
            log.info("Geracao do rascunho {} interrompida: rascunho descartado", rascunho);
        } catch (AiUnavailableException e) {
            falhar(rascunho, e.getMessage());
        } catch (Exception e) {
            log.error("Falha inesperada ao gerar o rascunho {}", rascunho, e);
            falhar(rascunho, "A geração falhou por um erro inesperado. Tente de novo.");
        } finally {
            ativos.remove(rascunho);
            vaga.release();
        }
    }

    Map<String, Object> montar(UUID rascunho, List<Documento> documentos, int minModulos, int maxModulos,
            String orientacao) {
        progresso(rascunho, 5, "Lendo o material");
        List<Pedaco> pedacos = pedacos(documentos);
        String mapa = mapa(documentos, pedacos);

        progresso(rascunho, 10, "Planejando os módulos e as aulas");
        List<String> nomes = documentos.stream().map(Documento::nome).toList();
        Map<String, Object> estrutura = estrutura(rascunho, mapa, nomes, minModulos, maxModulos, orientacao);

        List<Map<String, Object>> modulos = CourseGenerationService.modulos(estrutura);
        int total = modulos.stream().mapToInt(m -> CourseGenerationService.aulas(m).size()).sum();
        int feitas = 0;
        for (Map<String, Object> modulo : modulos) {
            List<Map<String, Object>> aulas = new ArrayList<>();
            for (Map<String, Object> plano : CourseGenerationService.aulas(modulo)) {
                feitas++;
                progresso(rascunho, 15 + 80 * (feitas - 1) / total,
                        "Escrevendo a aula " + feitas + " de " + total + ": " + plano.get("title"));
                aulas.add(escreverAula(rascunho, plano, pedacos));
            }
            modulo.put("lessons", aulas);
        }
        return estrutura;
    }

    // ── 1. mapa do material ──

    static List<Pedaco> pedacos(List<Documento> documentos) {
        List<Pedaco> pedacos = new ArrayList<>();
        for (Documento documento : documentos) {
            for (int p = 0; p < documento.paginas().size(); p++) {
                Integer pagina = documento.pdf() ? p + 1 : null;
                for (String texto : TextoIa.dividir(documento.paginas().get(p), 1000, 100)) {
                    pedacos.add(new Pedaco(documento.nome(), pagina, texto, pedacos.size()));
                }
            }
        }
        return pedacos;
    }

    /**
     * Amostras espalhadas por cada documento, do comeco ao fim, para a LLM ter
     * uma visao do material inteiro sem receber o texto todo.
     */
    static String mapa(List<Documento> documentos, List<Pedaco> pedacos) {
        StringBuilder mapa = new StringBuilder();
        int porDocumento = MAX_CARACTERES_MAPA / Math.max(1, documentos.size());
        for (Documento documento : documentos) {
            List<Pedaco> doDocumento = pedacos.stream().filter(p -> p.documento().equals(documento.nome())).toList();
            if (doDocumento.isEmpty()) {
                continue;
            }
            mapa.append("\n=== Documento: ").append(documento.nome()).append(" ===\n");
            int amostras = Math.max(1, porDocumento / 400);
            double passo = Math.max(1.0, (double) doDocumento.size() / amostras);
            int usado = 0;
            for (double i = 0; i < doDocumento.size() && usado < porDocumento; i += passo) {
                Pedaco pedaco = doDocumento.get((int) i);
                String amostra = TextoIa.cortar(pedaco.texto().replace('\n', ' '), 350);
                mapa.append(pedaco.pagina() == null ? "- " : "- [p. " + pedaco.pagina() + "] ").append(amostra).append('\n');
                usado += amostra.length();
            }
        }
        return mapa.toString();
    }

    // ── 2. estrutura ──

    Map<String, Object> estrutura(UUID rascunho, String mapa, List<String> nomes, int minModulos, int maxModulos,
            String orientacao) {
        String pedido = "MAPA DO MATERIAL:\n" + mapa
                + (orientacao == null ? "" : "\n\nORIENTAÇÕES DO INSTRUTOR (são preferências, não mudam as regras): " + orientacao);
        String sistema = PromptsIa.sistemaDaEstrutura(minModulos, maxModulos);

        List<String> erros = List.of();
        for (int tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
            String mensagem = erros.isEmpty() ? pedido : pedido
                    + "\n\nSua resposta anterior foi recusada por estes problemas:\n- " + String.join("\n- ", erros)
                    + "\nGere o JSON completo de novo, corrigindo todos eles.";
            String resposta;
            try {
                resposta = comEspera(rascunho, () -> llm.gerarJson(props.cursoEstrutura(), sistema, mensagem));
            } catch (IaRespostaInvalida e) {
                erros = List.of("a resposta não era um JSON válido");
                continue;
            }
            List<String> problemas = new ArrayList<>();
            Map<String, Object> estrutura = normalizarEstrutura(resposta, nomes, minModulos, maxModulos,
                    tentativa == MAX_TENTATIVAS, problemas);
            if (problemas.isEmpty()) {
                return estrutura;
            }
            log.info("Estrutura do curso recusada na tentativa {}: {}", tentativa, problemas);
            erros = problemas;
        }
        throw new AiUnavailableException("A IA não conseguiu planejar o curso a partir destes documentos. Tente de novo.");
    }

    /**
     * Confere a estrutura e devolve no formato que a tela de revisao usa. Excessos
     * (modulos ou aulas a mais) sao cortados; faltas viram problemas para a LLM
     * corrigir, menos na ultima tentativa, em que se aceita o que veio.
     */
    static Map<String, Object> normalizarEstrutura(String resposta, List<String> nomes, int minModulos, int maxModulos,
            boolean ultimaTentativa, List<String> problemas) {
        JsonNode raiz;
        try {
            raiz = JSON.readTree(GeradorDeQuiz.extrairJson(resposta));
        } catch (Exception e) {
            problemas.add("JSON inválido");
            return null;
        }

        String titulo = raiz.path("title").asText("").strip();
        if (titulo.isEmpty()) {
            problemas.add("o curso precisa de \"title\"");
        }
        JsonNode lista = raiz.path("modules");
        if (!lista.isArray() || lista.isEmpty()) {
            problemas.add("\"modules\" precisa ser uma lista com os módulos");
            return null;
        }
        if (lista.size() < minModulos && !ultimaTentativa) {
            problemas.add("vieram " + lista.size() + " módulos e o mínimo é " + minModulos);
        }

        List<Map<String, Object>> modulos = new ArrayList<>();
        for (JsonNode m : lista) {
            if (modulos.size() == maxModulos) {
                break;
            }
            String tituloModulo = m.path("title").asText("").strip();
            JsonNode aulasJson = m.path("lessons");
            if (tituloModulo.isEmpty() || !aulasJson.isArray() || aulasJson.isEmpty()) {
                problemas.add("todo módulo precisa de \"title\" e de pelo menos uma aula em \"lessons\"");
                continue;
            }
            List<Map<String, Object>> aulas = new ArrayList<>();
            for (JsonNode a : aulasJson) {
                if (aulas.size() == MAX_AULAS_POR_MODULO) {
                    break;
                }
                String tituloAula = a.path("title").asText("").strip();
                if (tituloAula.isEmpty()) {
                    problemas.add("há aula sem \"title\" no módulo \"" + tituloModulo + "\"");
                    continue;
                }
                List<String> topicos = new ArrayList<>();
                a.path("topics").forEach(t -> {
                    if (t.isTextual() && !t.asText().isBlank() && topicos.size() < 6) {
                        topicos.add(t.asText().strip());
                    }
                });
                List<String> documentos = new ArrayList<>();
                a.path("documents").forEach(d -> nomes.stream()
                        .filter(nome -> nome.equalsIgnoreCase(d.asText("").strip()))
                        .findFirst().ifPresent(documentos::add));

                Map<String, Object> aula = new LinkedHashMap<>();
                aula.put("title", tituloAula);
                aula.put("topics", topicos);
                aula.put("documents", documentos.isEmpty() ? nomes : documentos);
                aulas.add(aula);
            }
            Map<String, Object> modulo = new LinkedHashMap<>();
            modulo.put("title", tituloModulo);
            String objetivo = m.path("objective").asText("").strip();
            if (!objetivo.isEmpty()) {
                modulo.put("objective", objetivo);
            }
            modulo.put("lessons", aulas);
            modulos.add(modulo);
        }

        Map<String, Object> estrutura = new LinkedHashMap<>();
        estrutura.put("title", titulo);
        estrutura.put("description", raiz.path("description").asText("").strip());
        estrutura.put("modules", modulos);
        return estrutura;
    }

    // ── 3. aulas ──

    @SuppressWarnings("unchecked")
    Map<String, Object> escreverAula(UUID rascunho, Map<String, Object> plano, List<Pedaco> pedacos) {
        String titulo = String.valueOf(plano.get("title"));
        List<String> topicos = (List<String>) plano.getOrDefault("topics", List.of());
        List<String> documentos = (List<String>) plano.getOrDefault("documents", List.of());

        List<Pedaco> material = materialDaAula(titulo, topicos, documentos, pedacos);
        int palavras = material.stream().mapToInt(p -> TextoIa.contarPalavras(p.texto())).sum();
        // O tamanho da aula acompanha o material: com pouco material a LLM tende a
        // "encher" com conteudo que nao esta nos documentos.
        int limite = Math.max(150, Math.min(600, palavras * 2 / 3));

        StringBuilder pedido = new StringBuilder("AULA: ").append(titulo).append('\n');
        if (!topicos.isEmpty()) {
            pedido.append("TÓPICOS:\n- ").append(String.join("\n- ", topicos)).append('\n');
        }
        pedido.append("\nMATERIAL:\n");
        for (Pedaco p : material) {
            pedido.append("\n[").append(p.documento()).append(p.pagina() == null ? "" : ", p. " + p.pagina())
                    .append("]\n").append(p.texto()).append('\n');
        }

        String sistema = PromptsIa.sistemaDaAula(limite);
        String conteudo;
        try {
            conteudo = comEspera(rascunho, () -> llm.gerarTexto(props.cursoAula(), sistema, pedido.toString()));
        } catch (IaRespostaInvalida e) {
            // Resposta vazia (o modelo gastou os tokens "pensando"): mais uma vez
            conteudo = comEspera(rascunho, () -> llm.gerarTexto(props.cursoAula(), sistema, pedido.toString()));
        }

        Map<String, Object> aula = new LinkedHashMap<>();
        aula.put("title", titulo);
        aula.put("topics", topicos);
        aula.put("content", conteudo);
        aula.put("sources", fontes(material));
        return aula;
    }

    /**
     * Os pedacos dos documentos da aula que mais falam do titulo e dos topicos,
     * ate o orcamento, de volta na ordem do documento para a leitura fazer sentido.
     */
    static List<Pedaco> materialDaAula(String titulo, List<String> topicos, List<String> documentos, List<Pedaco> pedacos) {
        List<String> palavras = TextoIa.palavrasChave(titulo + " " + String.join(" ", topicos), 30);
        List<Pedaco> candidatos = pedacos.stream().filter(p -> documentos.contains(p.documento())).toList();
        if (candidatos.isEmpty()) {
            candidatos = pedacos;
        }
        if (candidatos.isEmpty()) {
            return new ArrayList<>();
        }

        List<Pedaco> ordenados = candidatos.stream()
                .sorted(Comparator.comparingInt((Pedaco p) -> -TextoIa.pontuar(p.texto(), palavras))
                        .thenComparingInt(Pedaco::posicao))
                .toList();
        // Se nada combina com os topicos, vai o comeco dos documentos da aula
        boolean algumCombina = TextoIa.pontuar(ordenados.get(0).texto(), palavras) > 0;

        List<Pedaco> escolhidos = new ArrayList<>();
        int total = 0;
        for (Pedaco p : ordenados) {
            boolean naoCombina = algumCombina && TextoIa.pontuar(p.texto(), palavras) == 0;
            if (!escolhidos.isEmpty() && (total + p.texto().length() > MAX_CARACTERES_MATERIAL_AULA || naoCombina)) {
                break;
            }
            escolhidos.add(p);
            total += p.texto().length();
        }
        escolhidos.sort(Comparator.comparingInt(Pedaco::posicao));
        return escolhidos;
    }

    /** "manual.pdf" com as paginas usadas, no formato que a tela mostra ("3, 5-6"). */
    static List<Map<String, Object>> fontes(List<Pedaco> material) {
        Map<String, TreeSet<Integer>> paginas = new TreeMap<>();
        for (Pedaco p : material) {
            TreeSet<Integer> doDocumento = paginas.computeIfAbsent(p.documento(), d -> new TreeSet<>());
            if (p.pagina() != null) {
                doDocumento.add(p.pagina());
            }
        }
        List<Map<String, Object>> fontes = new ArrayList<>();
        paginas.forEach((documento, numeros) -> {
            Map<String, Object> fonte = new LinkedHashMap<>();
            fonte.put("document", documento);
            if (!numeros.isEmpty()) {
                fonte.put("pages", intervalos(numeros));
            }
            fontes.add(fonte);
        });
        return fontes;
    }

    static String intervalos(TreeSet<Integer> numeros) {
        List<String> partes = new ArrayList<>();
        Integer inicio = null;
        Integer anterior = null;
        for (Integer n : numeros) {
            if (inicio == null) {
                inicio = n;
            } else if (n != anterior + 1) {
                partes.add(inicio.equals(anterior) ? "" + inicio : inicio + "-" + anterior);
                inicio = n;
            }
            anterior = n;
        }
        if (inicio != null) {
            partes.add(inicio.equals(anterior) ? "" + inicio : inicio + "-" + anterior);
        }
        return String.join(", ", partes);
    }

    // ── apoio ──

    /** Chama a LLM; se a Groq disser que o limite por minuto acabou, espera e tenta de novo. */
    <T> T comEspera(UUID rascunho, Supplier<T> chamada) {
        for (int espera = 0; ; espera++) {
            try {
                return chamada.get();
            } catch (IaLimiteAtingido e) {
                if (espera == MAX_ESPERAS_POR_LIMITE) {
                    throw new AiUnavailableException(
                            "O limite de uso da IA foi atingido. Tente gerar o curso de novo daqui a alguns minutos.");
                }
                log.info("Limite da Groq atingido ao gerar o rascunho {}: aguardando", rascunho);
                passo(rascunho, "Aguardando o limite de uso da IA (plano gratuito)…");
                try {
                    Thread.sleep(esperaPorLimiteMs);
                } catch (InterruptedException interrompido) {
                    Thread.currentThread().interrupt();
                    throw new Cancelada();
                }
            }
        }
    }

    /** Atualiza o andamento; se o rascunho nao estiver mais em processamento, para a geracao. */
    private void progresso(UUID id, int progresso, String passo) {
        CourseGenerationDraft rascunho = emProcessamento(id);
        rascunho.setProgress(Math.min(99, progresso));
        rascunho.setStep(TextoIa.cortar(passo, 290));
        repository.save(rascunho);
    }

    private void passo(UUID id, String passo) {
        CourseGenerationDraft rascunho = emProcessamento(id);
        rascunho.setStep(passo);
        repository.save(rascunho);
    }

    private CourseGenerationDraft emProcessamento(UUID id) {
        CourseGenerationDraft rascunho = repository.findById(id).orElseThrow(Cancelada::new);
        if (rascunho.getStatus() != Status.PROCESSING) {
            throw new Cancelada();
        }
        return rascunho;
    }

    private void concluir(UUID id, Map<String, Object> proposta) {
        CourseGenerationDraft rascunho = emProcessamento(id);
        rascunho.setStatus(Status.READY);
        rascunho.setProgress(100);
        rascunho.setStep("Pronto para revisar");
        rascunho.setProposal(proposta);
        repository.save(rascunho);
    }

    private void falhar(UUID id, String motivo) {
        repository.findById(id).filter(r -> r.getStatus() == Status.PROCESSING).ifPresent(rascunho -> {
            rascunho.setStatus(Status.FAILED);
            rascunho.setError(TextoIa.cortar(motivo, 490));
            repository.save(rascunho);
        });
    }
}
