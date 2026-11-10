package com.trainify.lms.ai;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.trainify.lms.domain.entities.CourseGenerationDraft;
import com.trainify.lms.domain.entities.CourseGenerationDraft.Status;
import com.trainify.lms.domain.entities.Tenant;
import com.trainify.lms.domain.enums.Role;
import com.trainify.lms.dto.CourseDto;
import com.trainify.lms.dto.CreateCourseRequest;
import com.trainify.lms.dto.CreateLessonRequest;
import com.trainify.lms.dto.CreateModuleRequest;
import com.trainify.lms.dto.ModuleDto;
import com.trainify.lms.repositories.CourseGenerationDraftRepository;
import com.trainify.lms.security.CustomUserDetails;
import com.trainify.lms.services.CourseService;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * "Criar curso com IA": o instrutor envia documentos, a IA propoe titulo,
 * modulos e aulas (com as paginas de origem), o instrutor revisa, edita e
 * aprova. So na aprovacao o curso e criado, em rascunho, pelo mesmo
 * {@link CourseService} do cadastro manual.
 *
 * <p>Aqui ficam o envio, a revisao e a aprovacao. Quem conversa com a LLM e o
 * {@link GeradorDeCurso}, em segundo plano.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CourseGenerationService {

    /*
     * Os arquivos sao lidos inteiros na memoria so para extrair o texto; depois
     * fica so o texto. A instancia gratuita tem pouco mais de 300 MB de heap: se
     * o plano mudar, e aqui e no multipart do application.yml que estes numeros
     * crescem juntos.
     */
    static final int MAX_DOCUMENTOS = 5;
    static final long MAX_BYTES_POR_DOCUMENTO = 10L * 1024 * 1024;
    static final long MAX_BYTES_TOTAL = 15L * 1024 * 1024;
    private static final int MAX_TITULO = 200;

    private final GeradorDeCurso gerador;
    private final CourseGenerationDraftRepository repository;
    private final CourseService courseService;

    public record DraftDto(
            UUID id, String status, int progress, String step, List<String> documentNames,
            String instructions, Map<String, Object> proposal, String error, UUID courseId, Instant createdAt) {}

    // ── comecar ──

    /**
     * Le os documentos, grava o rascunho e entrega a geracao para o
     * {@link GeradorDeCurso}, que roda em segundo plano. A tela acompanha pelo
     * {@link #obter}.
     */
    public DraftDto iniciar(List<MultipartFile> arquivos, String instrucoes, int minModulos, int maxModulos) {
        CustomUserDetails usuario = usuarioAtual();
        if (minModulos < 1 || maxModulos > 8 || minModulos > maxModulos) {
            throw new IllegalArgumentException("Escolha entre 1 e 8 módulos.");
        }
        if (!gerador.configurada()) {
            throw new AiUnavailableException("O assistente de IA não está configurado neste ambiente.");
        }

        if (!gerador.reservar()) {
            throw new AiUnavailableException(
                    "Já há uma geração de curso em andamento. Aguarde terminar e tente de novo.");
        }
        boolean entregue = false;
        try {
            List<GeradorDeCurso.Documento> documentos = lerDocumentos(arquivos);
            String orientacao = instrucoes == null || instrucoes.isBlank() ? null
                    : instrucoes.trim().substring(0, Math.min(500, instrucoes.trim().length()));

            CourseGenerationDraft rascunho = new CourseGenerationDraft();
            rascunho.setTenantId(usuario.getTenantId());
            rascunho.setCreatedBy(usuario.getId());
            rascunho.setStatus(Status.PROCESSING);
            rascunho.setProgress(0);
            rascunho.setStep("Começando");
            rascunho.setDocumentNames(documentos.stream().map(GeradorDeCurso.Documento::nome).toList());
            rascunho.setInstructions(orientacao);
            rascunho = repository.saveAndFlush(rascunho);

            gerador.registrar(rascunho.getId());
            gerador.gerar(rascunho.getId(), documentos, minModulos, maxModulos, orientacao);
            entregue = true;
            return dto(rascunho);
        } finally {
            if (!entregue) {
                // A vaga so passa para o gerador se a geracao comecou
                gerador.liberar();
            }
        }
    }

    /**
     * Extrai o texto de cada documento: PDFs pagina por pagina (para citar as
     * paginas nas fontes), .txt e .md inteiros. Nomes repetidos ganham um sufixo.
     */
    List<GeradorDeCurso.Documento> lerDocumentos(List<MultipartFile> arquivos) {
        List<MultipartFile> validos = arquivos == null ? List.of()
                : arquivos.stream().filter(a -> a != null && !a.isEmpty()).toList();
        if (validos.isEmpty()) {
            throw new IllegalArgumentException("Envie pelo menos um documento (PDF, .txt ou .md).");
        }
        if (validos.size() > MAX_DOCUMENTOS) {
            throw new IllegalArgumentException("Envie no máximo " + MAX_DOCUMENTOS + " documentos por vez.");
        }

        // Os tamanhos sao conferidos antes de ler qualquer byte: recusar no ultimo
        // arquivo depois de carregar os anteriores ja custou a memoria toda.
        long total = 0;
        for (MultipartFile arquivo : validos) {
            if (arquivo.getSize() > MAX_BYTES_POR_DOCUMENTO) {
                throw new IllegalArgumentException("\"" + nomeLegivel(arquivo) + "\" passa de "
                        + (MAX_BYTES_POR_DOCUMENTO / (1024 * 1024)) + " MB.");
            }
            total += arquivo.getSize();
        }
        if (total > MAX_BYTES_TOTAL) {
            throw new IllegalArgumentException("Os documentos passam de "
                    + (MAX_BYTES_TOTAL / (1024 * 1024)) + " MB no total. Envie menos arquivos por vez.");
        }

        Set<String> nomes = new HashSet<>();
        List<GeradorDeCurso.Documento> documentos = new ArrayList<>();
        List<String> semTexto = new ArrayList<>();
        for (MultipartFile arquivo : validos) {
            String nome = nomeUnico(arquivo.getOriginalFilename(), nomes);

            byte[] bytes;
            try {
                bytes = arquivo.getBytes();
            } catch (IOException e) {
                throw new IllegalArgumentException("Não foi possível ler \"" + nome + "\".");
            }
            String minusculo = nome.toLowerCase(Locale.ROOT);
            GeradorDeCurso.Documento documento;
            if (bytes.length >= 4 && new String(bytes, 0, 4, StandardCharsets.US_ASCII).equals("%PDF")) {
                documento = new GeradorDeCurso.Documento(nome, TextoIa.paginasDoPdf(bytes), true);
            } else if (minusculo.endsWith(".txt") || minusculo.endsWith(".md")) {
                documento = new GeradorDeCurso.Documento(nome, List.of(new String(bytes, StandardCharsets.UTF_8)), false);
            } else {
                throw new IllegalArgumentException("\"" + nome + "\" não é PDF nem texto (.txt ou .md).");
            }

            if (documento.paginas().stream().allMatch(String::isBlank)) {
                semTexto.add(nome);
            } else {
                documentos.add(documento);
            }
        }
        if (documentos.isEmpty()) {
            throw new IllegalArgumentException("Não encontrei texto em " + String.join(", ", semTexto)
                    + ". PDFs escaneados (só imagem) não funcionam: envie um PDF com texto selecionável ou um .txt.");
        }
        return documentos;
    }

    private static String nomeLegivel(MultipartFile arquivo) {
        String nome = arquivo.getOriginalFilename();
        return nome == null || nome.isBlank() ? "documento" : nome;
    }

    private static String nomeUnico(String original, Set<String> usados) {
        String base = original == null || original.isBlank() ? "documento" : original.trim();
        base = base.substring(0, Math.min(150, base.length()));
        String nome = base;
        for (int i = 2; !usados.add(nome.toLowerCase(Locale.ROOT)); i++) {
            nome = base + " (" + i + ")";
        }
        return nome;
    }

    // ── acompanhar ──

    @Transactional
    public DraftDto obter(UUID id) {
        CourseGenerationDraft rascunho = buscar(id);
        if (rascunho.getStatus() == Status.PROCESSING && !gerador.emAndamento(id)) {
            // O andamento fica no banco, mas o trabalho roda na memoria do servidor:
            // se ele reiniciou no meio, ninguem mais esta gerando este rascunho.
            falhar(rascunho, "A geração foi interrompida porque o servidor reiniciou. Envie os documentos de novo.");
        }
        return dto(rascunho);
    }

    private void falhar(CourseGenerationDraft rascunho, String motivo) {
        rascunho.setStatus(Status.FAILED);
        rascunho.setError(motivo.substring(0, Math.min(500, motivo.length())));
        repository.save(rascunho);
    }

    // ── revisar ──

    /** Guarda as edicoes do instrutor (titulos, textos, aulas e modulos removidos). */
    @Transactional
    public DraftDto salvarProposta(UUID id, Map<String, Object> proposta) {
        CourseGenerationDraft rascunho = buscar(id);
        exigirStatus(rascunho, Status.READY);
        validarProposta(proposta);
        rascunho.setProposal(proposta);
        return dto(repository.save(rascunho));
    }

    @SuppressWarnings("unchecked")
    static List<Map<String, Object>> modulos(Map<String, Object> proposta) {
        Object modulos = proposta == null ? null : proposta.get("modules");
        return modulos instanceof List<?> lista ? (List<Map<String, Object>>) lista : List.of();
    }

    @SuppressWarnings("unchecked")
    static List<Map<String, Object>> aulas(Map<String, Object> modulo) {
        Object aulas = modulo.get("lessons");
        return aulas instanceof List<?> lista ? (List<Map<String, Object>>) lista : List.of();
    }

    static void validarProposta(Map<String, Object> proposta) {
        if (texto(proposta, "title").isBlank()) {
            throw new IllegalArgumentException("Dê um título ao curso.");
        }
        List<Map<String, Object>> modulos = modulos(proposta);
        if (modulos.isEmpty()) {
            throw new IllegalArgumentException("O curso precisa de pelo menos um módulo.");
        }
        for (int m = 0; m < modulos.size(); m++) {
            Map<String, Object> modulo = modulos.get(m);
            if (texto(modulo, "title").isBlank()) {
                throw new IllegalArgumentException("Dê um título ao módulo " + (m + 1) + ".");
            }
            List<Map<String, Object>> aulas = aulas(modulo);
            if (aulas.isEmpty()) {
                throw new IllegalArgumentException("O módulo \"" + texto(modulo, "title") + "\" ficou sem aulas.");
            }
            for (Map<String, Object> aula : aulas) {
                if (texto(aula, "title").isBlank()) {
                    throw new IllegalArgumentException("Há uma aula sem título no módulo \"" + texto(modulo, "title") + "\".");
                }
            }
        }
    }

    // ── aprovar ──

    /** Cria o curso em rascunho com a proposta revisada. Publicar continua sendo um passo do instrutor. */
    @Transactional
    public DraftDto aprovar(UUID id) {
        CourseGenerationDraft rascunho = buscar(id);
        exigirStatus(rascunho, Status.READY);
        Map<String, Object> proposta = rascunho.getProposal();
        validarProposta(proposta);
        CustomUserDetails usuario = usuarioAtual();

        CreateCourseRequest curso = new CreateCourseRequest();
        curso.setTitle(limitar(texto(proposta, "title"), MAX_TITULO));
        String descricao = texto(proposta, "description");
        curso.setDescription(descricao.isBlank() ? "Curso gerado a partir dos documentos da empresa." : descricao);
        Tenant empresa = new Tenant();
        empresa.setId(rascunho.getTenantId());
        CourseDto criado = courseService.createCourse(curso, usuario.getId(), empresa);

        for (Map<String, Object> modulo : modulos(proposta)) {
            CreateModuleRequest novoModulo = new CreateModuleRequest();
            novoModulo.setTitle(limitar(texto(modulo, "title"), MAX_TITULO));
            ModuleDto moduloCriado = courseService.addModule(criado.getId(), novoModulo);

            for (Map<String, Object> aula : aulas(modulo)) {
                CreateLessonRequest novaAula = new CreateLessonRequest();
                novaAula.setTitle(limitar(texto(aula, "title"), MAX_TITULO));
                novaAula.setLessonType("ARTICLE");
                novaAula.setContent(conteudoComFontes(aula));
                courseService.addLesson(moduloCriado.getId(), novaAula);
            }

            // Aula de avaliacao vazia: o instrutor gera o quiz pelo "Gerar com IA"
            CreateLessonRequest avaliacao = new CreateLessonRequest();
            avaliacao.setTitle(limitar("Avaliação: " + texto(modulo, "title"), MAX_TITULO));
            avaliacao.setLessonType("QUIZ");
            courseService.addLesson(moduloCriado.getId(), avaliacao);
        }

        rascunho.setStatus(Status.APPROVED);
        rascunho.setCourseId(criado.getId());
        repository.save(rascunho);
        return dto(rascunho);
    }

    @SuppressWarnings("unchecked")
    static String conteudoComFontes(Map<String, Object> aula) {
        StringBuilder conteudo = new StringBuilder(texto(aula, "content").trim());
        Object fontes = aula.get("sources");
        if (fontes instanceof List<?> lista && !lista.isEmpty()) {
            List<String> partes = new ArrayList<>();
            for (Object item : lista) {
                if (item instanceof Map<?, ?> fonte) {
                    String doc = texto((Map<String, Object>) fonte, "document");
                    String paginas = texto((Map<String, Object>) fonte, "pages");
                    if (!doc.isBlank()) {
                        partes.add(paginas.isBlank() ? doc : doc + " (p. " + paginas + ")");
                    }
                }
            }
            if (!partes.isEmpty()) {
                conteudo.append("\n\n---\n*Material de origem: ").append(String.join("; ", partes)).append("*");
            }
        }
        return conteudo.toString();
    }

    // ── descartar ──

    @Transactional
    public void descartar(UUID id) {
        CourseGenerationDraft rascunho = buscar(id);
        if (rascunho.getStatus() == Status.APPROVED) {
            throw new IllegalArgumentException("Este rascunho já virou um curso.");
        }
        // Se a IA ainda estiver gerando, ela ve o novo status e para
        rascunho.setStatus(Status.DISCARDED);
        repository.save(rascunho);
    }

    // ── apoio ──

    /** Quem criou o rascunho e os administradores da mesma empresa. */
    private CourseGenerationDraft buscar(UUID id) {
        CustomUserDetails usuario = usuarioAtual();
        CourseGenerationDraft rascunho = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Rascunho de curso não encontrado"));
        Role papel = AiCourseScope.papelDe(usuario);
        boolean mesmaEmpresa = rascunho.getTenantId().equals(usuario.getTenantId());
        boolean dono = rascunho.getCreatedBy().equals(usuario.getId());
        boolean admin = papel == Role.ADMIN || papel == Role.SUPER_ADMIN;
        if (!mesmaEmpresa || !(dono || admin)) {
            throw new EntityNotFoundException("Rascunho de curso não encontrado");
        }
        return rascunho;
    }

    private static void exigirStatus(CourseGenerationDraft rascunho, Status esperado) {
        if (rascunho.getStatus() != esperado) {
            throw new IllegalArgumentException(switch (rascunho.getStatus()) {
                case PROCESSING -> "A IA ainda está gerando o curso. Aguarde terminar.";
                case APPROVED -> "Este rascunho já virou um curso.";
                case DISCARDED -> "Este rascunho foi descartado.";
                default -> "A geração deste rascunho falhou. Envie os documentos de novo.";
            });
        }
    }

    static String texto(Map<String, Object> mapa, String campo) {
        Object valor = mapa == null ? null : mapa.get(campo);
        return valor == null ? "" : valor.toString().trim();
    }

    private static String limitar(String texto, int maximo) {
        return texto.length() <= maximo ? texto : texto.substring(0, maximo - 1).trim() + "…";
    }

    private static CustomUserDetails usuarioAtual() {
        var autenticacao = SecurityContextHolder.getContext().getAuthentication();
        if (autenticacao == null || !(autenticacao.getPrincipal() instanceof CustomUserDetails usuario)) {
            throw new AccessDeniedException("Usuário não autenticado");
        }
        return usuario;
    }

    private static DraftDto dto(CourseGenerationDraft r) {
        return new DraftDto(r.getId(), r.getStatus().name(), r.getProgress() == null ? 0 : r.getProgress(), r.getStep(),
                r.getDocumentNames(), r.getInstructions(), r.getProposal(), r.getError(), r.getCourseId(), r.getCreatedAt());
    }
}
