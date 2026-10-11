package com.trainify.lms.ai;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
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

import feign.FeignException;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Gera um curso a partir dos documentos do instrutor. A IA propoe titulo,
 * modulos e aulas (com as paginas de origem); o instrutor revisa, edita e
 * aprova. So na aprovacao o curso e criado, em rascunho, pelo mesmo
 * {@link CourseService} do cadastro manual.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CourseGenerationService {

    static final int MAX_DOCUMENTOS = 10;
    static final long MAX_BYTES_POR_DOCUMENTO = 20L * 1024 * 1024;
    static final long MAX_BYTES_TOTAL = 50L * 1024 * 1024;
    private static final int MAX_TITULO = 200;

    private final TrainifyAiClient ai;
    private final CourseGenerationDraftRepository repository;
    private final CourseService courseService;

    public record DraftDto(
            UUID id, String status, int progress, String step, List<String> documentNames,
            String instructions, Map<String, Object> proposal, String error, UUID courseId, Instant createdAt) {}

    // ── comecar ──

    @Transactional
    public DraftDto iniciar(List<MultipartFile> arquivos, String instrucoes, int minModulos, int maxModulos) {
        CustomUserDetails usuario = usuarioAtual();
        List<TrainifyAiClient.DraftDocument> documentos = lerDocumentos(arquivos);
        if (minModulos < 1 || maxModulos > 8 || minModulos > maxModulos) {
            throw new IllegalArgumentException("Escolha entre 1 e 8 módulos.");
        }
        String orientacao = instrucoes == null || instrucoes.isBlank() ? null
                : instrucoes.trim().substring(0, Math.min(500, instrucoes.trim().length()));

        CourseGenerationDraft rascunho = new CourseGenerationDraft();
        rascunho.setTenantId(usuario.getTenantId());
        rascunho.setCreatedBy(usuario.getId());
        rascunho.setStatus(Status.PROCESSING);
        rascunho.setStep("Enviando os documentos para a IA");
        rascunho.setDocumentNames(documentos.stream().map(TrainifyAiClient.DraftDocument::name).toList());
        rascunho.setInstructions(orientacao);
        rascunho = repository.saveAndFlush(rascunho);

        final UUID id = rascunho.getId();
        AiErrors.chamar(() -> ai.createCourseDraft(new TrainifyAiClient.CourseDraftRequest(
                id.toString(), documentos, minModulos, maxModulos, orientacao)));
        return dto(rascunho);
    }

    /** PDFs viram base64; .txt e .md vao como texto. Nomes repetidos ganham um sufixo. */
    List<TrainifyAiClient.DraftDocument> lerDocumentos(List<MultipartFile> arquivos) {
        List<MultipartFile> validos = arquivos == null ? List.of()
                : arquivos.stream().filter(a -> a != null && !a.isEmpty()).toList();
        if (validos.isEmpty()) {
            throw new IllegalArgumentException("Envie pelo menos um documento (PDF, .txt ou .md).");
        }
        if (validos.size() > MAX_DOCUMENTOS) {
            throw new IllegalArgumentException("Envie no máximo " + MAX_DOCUMENTOS + " documentos por vez.");
        }

        long total = 0;
        Set<String> nomes = new HashSet<>();
        List<TrainifyAiClient.DraftDocument> documentos = new ArrayList<>();
        for (MultipartFile arquivo : validos) {
            String nome = nomeUnico(arquivo.getOriginalFilename(), nomes);
            if (arquivo.getSize() > MAX_BYTES_POR_DOCUMENTO) {
                throw new IllegalArgumentException("\"" + nome + "\" passa de 20 MB.");
            }
            total += arquivo.getSize();
            if (total > MAX_BYTES_TOTAL) {
                throw new IllegalArgumentException("Os documentos passam de 50 MB no total. Envie menos arquivos por vez.");
            }

            byte[] bytes;
            try {
                bytes = arquivo.getBytes();
            } catch (IOException e) {
                throw new IllegalArgumentException("Não foi possível ler \"" + nome + "\".");
            }
            String minusculo = nome.toLowerCase(Locale.ROOT);
            if (bytes.length >= 4 && new String(bytes, 0, 4, StandardCharsets.US_ASCII).equals("%PDF")) {
                documentos.add(new TrainifyAiClient.DraftDocument(nome, Base64.getEncoder().encodeToString(bytes), null));
            } else if (minusculo.endsWith(".txt") || minusculo.endsWith(".md")) {
                documentos.add(new TrainifyAiClient.DraftDocument(nome, null, new String(bytes, StandardCharsets.UTF_8)));
            } else {
                throw new IllegalArgumentException("\"" + nome + "\" não é PDF nem texto (.txt ou .md).");
            }
        }
        return documentos;
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
        if (rascunho.getStatus() == Status.PROCESSING) {
            sincronizar(rascunho);
        }
        return dto(rascunho);
    }

    /** Traz o andamento do servico de IA. Falha de rede nao muda nada: tenta na proxima consulta. */
    private void sincronizar(CourseGenerationDraft rascunho) {
        TrainifyAiClient.CourseDraftStatus estado;
        try {
            estado = ai.courseDraft(rascunho.getId().toString());
        } catch (FeignException.NotFound e) {
            falhar(rascunho, "A geração foi interrompida porque o serviço de IA reiniciou. Envie os documentos de novo.");
            return;
        } catch (FeignException e) {
            log.debug("Servico de IA indisponivel ao consultar o rascunho {}: {}", rascunho.getId(), e.getMessage());
            return;
        }

        rascunho.setProgress(estado.progress() == null ? rascunho.getProgress() : estado.progress());
        rascunho.setStep(estado.step());
        if ("READY".equals(estado.status())) {
            rascunho.setStatus(Status.READY);
            rascunho.setProposal(estado.result());
        } else if ("FAILED".equals(estado.status())) {
            falhar(rascunho, estado.error() == null ? "A IA não conseguiu gerar o curso." : estado.error());
        }
        repository.save(rascunho);
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
        descartarNaIa(rascunho);
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
        rascunho.setStatus(Status.DISCARDED);
        repository.save(rascunho);
        descartarNaIa(rascunho);
    }

    private void descartarNaIa(CourseGenerationDraft rascunho) {
        try {
            ai.deleteCourseDraft(rascunho.getId().toString());
        } catch (Exception e) {
            // O servico de IA so guarda os rascunhos em memoria; perder isto nao importa
            log.debug("Nao foi possivel descartar o rascunho {} na IA: {}", rascunho.getId(), e.getMessage());
        }
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
