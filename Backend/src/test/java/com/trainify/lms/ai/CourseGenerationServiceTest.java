package com.trainify.lms.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.multipart.MultipartFile;

import com.trainify.lms.domain.entities.CourseGenerationDraft;
import com.trainify.lms.domain.entities.CourseGenerationDraft.Status;
import com.trainify.lms.domain.entities.Tenant;
import com.trainify.lms.domain.entities.User;
import com.trainify.lms.domain.enums.Role;
import com.trainify.lms.dto.CourseDto;
import com.trainify.lms.dto.CreateLessonRequest;
import com.trainify.lms.dto.ModuleDto;
import com.trainify.lms.repositories.CourseGenerationDraftRepository;
import com.trainify.lms.security.CustomUserDetails;
import com.trainify.lms.services.CourseService;

import jakarta.persistence.EntityNotFoundException;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CourseGenerationServiceTest {

    @Mock private TrainifyAiClient ai;
    @Mock private CourseGenerationDraftRepository repository;
    @Mock private CourseService courseService;

    @InjectMocks private CourseGenerationService service;

    private final Tenant empresa = new Tenant();
    private User instrutor;

    @BeforeEach
    void preparar() {
        empresa.setId(UUID.randomUUID());
        instrutor = logar(Role.INSTRUCTOR);
        when(repository.saveAndFlush(any())).thenAnswer(i -> {
            CourseGenerationDraft r = i.getArgument(0);
            r.setId(UUID.randomUUID());
            return r;
        });
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    @AfterEach
    void limpar() {
        SecurityContextHolder.clearContext();
    }

    // ── enviar ──

    @Test
    void enviaPdfComoBase64ETextoComoTexto() {
        CourseGenerationService.DraftDto dto = service.iniciar(List.of(
                pdf("manual.pdf"), new MockMultipartFile("files", "artigo.md", "text/markdown", "# Artigo".getBytes())),
                "Foco em armazém", 2, 4);

        ArgumentCaptor<TrainifyAiClient.CourseDraftRequest> pedido = ArgumentCaptor.forClass(TrainifyAiClient.CourseDraftRequest.class);
        verify(ai).createCourseDraft(pedido.capture());
        assertEquals(dto.id().toString(), pedido.getValue().draftId());
        assertEquals("Foco em armazém", pedido.getValue().instructions());
        assertEquals(2, pedido.getValue().minModules());
        TrainifyAiClient.DraftDocument manual = pedido.getValue().documents().get(0);
        assertTrue(new String(java.util.Base64.getDecoder().decode(manual.pdfBase64()), StandardCharsets.US_ASCII).startsWith("%PDF"));
        assertNull(manual.text());
        assertEquals("# Artigo", pedido.getValue().documents().get(1).text());
        assertEquals("PROCESSING", dto.status());
        assertEquals(List.of("manual.pdf", "artigo.md"), dto.documentNames());
    }

    @Test
    void recusaArquivoQueNaoEPdfNemTexto() {
        MultipartFile planilha = new MockMultipartFile("files", "notas.xlsx", "application/vnd.ms-excel", new byte[]{1, 2, 3});
        IllegalArgumentException erro = assertThrows(IllegalArgumentException.class,
                () -> service.iniciar(List.of(planilha), null, 2, 5));
        assertTrue(erro.getMessage().contains("notas.xlsx"));
        verify(ai, never()).createCourseDraft(any());
    }

    @Test
    void recusaSemDocumentosOuComDocumentosDemais() {
        assertThrows(IllegalArgumentException.class, () -> service.iniciar(List.of(), null, 2, 5));
        List<MultipartFile> muitos = new ArrayList<>();
        for (int i = 0; i <= CourseGenerationService.MAX_DOCUMENTOS; i++) {
            muitos.add(pdf("doc" + i + ".pdf"));
        }
        assertThrows(IllegalArgumentException.class, () -> service.iniciar(muitos, null, 2, 5));
    }

    @Test
    void nomesRepetidosGanhamSufixo() {
        List<TrainifyAiClient.DraftDocument> docs = service.lerDocumentos(List.of(pdf("manual.pdf"), pdf("Manual.pdf")));
        assertEquals("manual.pdf", docs.get(0).name());
        assertEquals("Manual.pdf (2)", docs.get(1).name());
    }

    // ── acompanhar ──

    @Test
    void trazAPropostaQuandoAIaTermina() {
        CourseGenerationDraft rascunho = rascunho(instrutor, Status.PROCESSING);
        Map<String, Object> proposta = proposta();
        when(ai.courseDraft(rascunho.getId().toString()))
                .thenReturn(new TrainifyAiClient.CourseDraftStatus("READY", 100, "Pronto", proposta, null));

        CourseGenerationService.DraftDto dto = service.obter(rascunho.getId());

        assertEquals("READY", dto.status());
        assertEquals(proposta, dto.proposal());
    }

    @Test
    void outroInstrutorNaoVeORascunho() {
        CourseGenerationDraft rascunho = rascunho(instrutor, Status.READY);
        logar(Role.INSTRUCTOR);
        assertThrows(EntityNotFoundException.class, () -> service.obter(rascunho.getId()));
    }

    // ── aprovar ──

    @Test
    void aprovarCriaOCursoComAulasFontesEAvaliacaoPorModulo() {
        CourseGenerationDraft rascunho = rascunho(instrutor, Status.READY);
        rascunho.setProposal(proposta());
        CourseDto curso = new CourseDto();
        curso.setId(UUID.randomUUID());
        ModuleDto modulo = new ModuleDto();
        modulo.setId(UUID.randomUUID());
        when(courseService.createCourse(any(), eq(instrutor.getId()), any())).thenReturn(curso);
        when(courseService.addModule(eq(curso.getId()), any())).thenReturn(modulo);

        CourseGenerationService.DraftDto dto = service.aprovar(rascunho.getId());

        ArgumentCaptor<CreateLessonRequest> aulas = ArgumentCaptor.forClass(CreateLessonRequest.class);
        verify(courseService, org.mockito.Mockito.times(2)).addLesson(eq(modulo.getId()), aulas.capture());
        CreateLessonRequest aula = aulas.getAllValues().get(0);
        assertEquals("ARTICLE", aula.getLessonType());
        assertTrue(aula.getContent().startsWith("## Uso do EPI"));
        assertTrue(aula.getContent().endsWith("*Material de origem: manual.pdf (p. 2-5)*"));
        CreateLessonRequest avaliacao = aulas.getAllValues().get(1);
        assertEquals("QUIZ", avaliacao.getLessonType());
        assertEquals("Avaliação: Proteção individual", avaliacao.getTitle());

        assertEquals("APPROVED", dto.status());
        assertEquals(curso.getId(), dto.courseId());
        verify(ai).deleteCourseDraft(rascunho.getId().toString());
    }

    @Test
    void naoAprovaEnquantoAIaGera() {
        CourseGenerationDraft rascunho = rascunho(instrutor, Status.PROCESSING);
        assertThrows(IllegalArgumentException.class, () -> service.aprovar(rascunho.getId()));
        verify(courseService, never()).createCourse(any(), any(), any());
    }

    @Test
    void edicaoComModuloSemAulasERecusada() {
        CourseGenerationDraft rascunho = rascunho(instrutor, Status.READY);
        Map<String, Object> editada = proposta();
        ((Map<String, Object>) ((List<?>) editada.get("modules")).get(0)).put("lessons", List.of());
        IllegalArgumentException erro = assertThrows(IllegalArgumentException.class,
                () -> service.salvarProposta(rascunho.getId(), editada));
        assertTrue(erro.getMessage().contains("ficou sem aulas"));
    }

    // ── apoio ──

    private User logar(Role role) {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setTenant(empresa);
        u.setRole(role);
        u.setIsActive(true);
        CustomUserDetails detalhes = new CustomUserDetails(u);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(detalhes, null, detalhes.getAuthorities()));
        return u;
    }

    private CourseGenerationDraft rascunho(User dono, Status status) {
        CourseGenerationDraft r = new CourseGenerationDraft();
        r.setId(UUID.randomUUID());
        r.setTenantId(empresa.getId());
        r.setCreatedBy(dono.getId());
        r.setStatus(status);
        when(repository.findById(r.getId())).thenReturn(Optional.of(r));
        return r;
    }

    private static MockMultipartFile pdf(String nome) {
        return new MockMultipartFile("files", nome, "application/pdf", "%PDF-1.4 conteudo".getBytes(StandardCharsets.US_ASCII));
    }

    private static Map<String, Object> proposta() {
        Map<String, Object> aula = new HashMap<>(Map.of(
                "title", "Uso do EPI",
                "content", "## Uso do EPI\nTexto da aula.",
                "sources", List.of(Map.of("document", "manual.pdf", "pages", "2-5"))));
        Map<String, Object> modulo = new HashMap<>(Map.of("title", "Proteção individual", "lessons", new ArrayList<>(List.of(aula))));
        return new HashMap<>(Map.of("title", "Segurança", "description", "Curso.", "modules", new ArrayList<>(List.of(modulo))));
    }
}
