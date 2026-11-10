package com.trainify.lms.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
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

    @Mock private GeradorDeCurso gerador;
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
        when(gerador.configurada()).thenReturn(true);
        when(gerador.reservar()).thenReturn(true);
    }

    @AfterEach
    void limpar() {
        SecurityContextHolder.clearContext();
    }

    // ── enviar ──

    @Test
    @SuppressWarnings("unchecked")
    void extraiOTextoEEntregaAGeracaoParaOGerador() {
        CourseGenerationService.DraftDto dto = service.iniciar(List.of(
                pdf("manual.pdf", "Uso de extintores", "Rotas de fuga"),
                new MockMultipartFile("files", "artigo.md", "text/markdown", "# Artigo".getBytes(StandardCharsets.UTF_8))),
                "Foco em armazém", 2, 4);

        ArgumentCaptor<List<GeradorDeCurso.Documento>> documentos = ArgumentCaptor.forClass(List.class);
        verify(gerador).registrar(dto.id());
        verify(gerador).gerar(eq(dto.id()), documentos.capture(), eq(2), eq(4), eq("Foco em armazém"));
        GeradorDeCurso.Documento manual = documentos.getValue().get(0);
        assertTrue(manual.pdf());
        assertEquals(List.of("Uso de extintores", "Rotas de fuga"), manual.paginas());
        assertEquals(List.of("# Artigo"), documentos.getValue().get(1).paginas());
        assertEquals("PROCESSING", dto.status());
        assertEquals(List.of("manual.pdf", "artigo.md"), dto.documentNames());
        verify(gerador, never()).liberar();
    }

    @Test
    void recusaArquivoQueNaoEPdfNemTextoEDevolveAVaga() {
        MultipartFile planilha = new MockMultipartFile("files", "notas.xlsx", "application/vnd.ms-excel", new byte[]{1, 2, 3});
        IllegalArgumentException erro = assertThrows(IllegalArgumentException.class,
                () -> service.iniciar(List.of(planilha), null, 2, 5));
        assertTrue(erro.getMessage().contains("notas.xlsx"));
        verify(gerador, never()).gerar(any(), anyList(), anyInt(), anyInt(), any());
        verify(gerador).liberar();
    }

    @Test
    void pdfSemTextoTemMensagemClara() {
        IllegalArgumentException erro = assertThrows(IllegalArgumentException.class,
                () -> service.iniciar(List.of(pdf("escaneado.pdf", "")), null, 2, 5));
        assertTrue(erro.getMessage().contains("escaneado.pdf"));
        assertTrue(erro.getMessage().contains("escaneados"));
    }

    @Test
    void recusaSemDocumentosOuComDocumentosDemais() {
        assertThrows(IllegalArgumentException.class, () -> service.iniciar(List.of(), null, 2, 5));
        List<MultipartFile> muitos = new ArrayList<>();
        for (int i = 0; i <= CourseGenerationService.MAX_DOCUMENTOS; i++) {
            muitos.add(pdf("doc" + i + ".pdf", "texto"));
        }
        assertThrows(IllegalArgumentException.class, () -> service.iniciar(muitos, null, 2, 5));
    }

    @Test
    void nomesRepetidosGanhamSufixo() {
        List<GeradorDeCurso.Documento> docs = service.lerDocumentos(List.of(pdf("manual.pdf", "a"), pdf("Manual.pdf", "b")));
        assertEquals("manual.pdf", docs.get(0).nome());
        assertEquals("Manual.pdf (2)", docs.get(1).nome());
    }

    @Test
    void umaGeracaoPorVez() {
        when(gerador.reservar()).thenReturn(false);

        AiUnavailableException erro = assertThrows(AiUnavailableException.class,
                () -> service.iniciar(List.of(pdf("manual.pdf", "texto")), null, 2, 4));

        assertTrue(erro.getMessage().contains("em andamento"));
        verify(repository, never()).saveAndFlush(any());
    }

    @Test
    void semChaveDaIaNemComeca() {
        when(gerador.configurada()).thenReturn(false);
        assertThrows(AiUnavailableException.class,
                () -> service.iniciar(List.of(pdf("manual.pdf", "texto")), null, 2, 4));
        verify(gerador, never()).reservar();
    }

    // ── acompanhar ──

    @Test
    void enquantoOGeradorTrabalhaORascunhoSegueEmProcessamento() {
        CourseGenerationDraft rascunho = rascunho(instrutor, Status.PROCESSING);
        when(gerador.emAndamento(rascunho.getId())).thenReturn(true);

        assertEquals("PROCESSING", service.obter(rascunho.getId()).status());
    }

    @Test
    void rascunhoOrfaoDeUmReinicioViraFalhaComExplicacao() {
        CourseGenerationDraft rascunho = rascunho(instrutor, Status.PROCESSING);
        when(gerador.emAndamento(rascunho.getId())).thenReturn(false);

        CourseGenerationService.DraftDto dto = service.obter(rascunho.getId());

        assertEquals("FAILED", dto.status());
        assertTrue(dto.error().contains("reiniciou"));
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
    }

    @Test
    void naoAprovaEnquantoAIaGera() {
        CourseGenerationDraft rascunho = rascunho(instrutor, Status.PROCESSING);
        when(gerador.emAndamento(rascunho.getId())).thenReturn(true);
        assertThrows(IllegalArgumentException.class, () -> service.aprovar(rascunho.getId()));
        verify(courseService, never()).createCourse(any(), any(), any());
    }

    @Test
    @SuppressWarnings("unchecked")
    void edicaoComModuloSemAulasERecusada() {
        CourseGenerationDraft rascunho = rascunho(instrutor, Status.READY);
        Map<String, Object> editada = proposta();
        ((Map<String, Object>) ((List<?>) editada.get("modules")).get(0)).put("lessons", List.of());
        IllegalArgumentException erro = assertThrows(IllegalArgumentException.class,
                () -> service.salvarProposta(rascunho.getId(), editada));
        assertTrue(erro.getMessage().contains("ficou sem aulas"));
    }

    @Test
    void descartarDuranteAGeracaoMarcaORascunhoParaOGeradorParar() {
        CourseGenerationDraft rascunho = rascunho(instrutor, Status.PROCESSING);
        service.descartar(rascunho.getId());
        assertEquals(Status.DISCARDED, rascunho.getStatus());
    }

    // ── memoria: o envio precisa caber na instancia ──

    @Test
    void recusaArquivoGrandeDemaisSemLerOConteudo() {
        MultipartFile gigante = pesadoDemais("manual.pdf", CourseGenerationService.MAX_BYTES_POR_DOCUMENTO + 1);

        IllegalArgumentException erro = assertThrows(IllegalArgumentException.class,
                () -> service.iniciar(List.of(gigante), null, 2, 4));

        assertTrue(erro.getMessage().contains("manual.pdf"));
        verify(gerador).liberar();
    }

    @Test
    void recusaQuandoASomaPassaDoLimiteAntesDeCarregarQualquerArquivo() {
        long metadeDoTeto = CourseGenerationService.MAX_BYTES_TOTAL / 2 + 1;
        // Cada um cabe sozinho; juntos, nao
        MultipartFile um = pesadoDemais("parte1.pdf", metadeDoTeto);
        MultipartFile dois = pesadoDemais("parte2.pdf", metadeDoTeto);

        IllegalArgumentException erro = assertThrows(IllegalArgumentException.class,
                () -> service.iniciar(List.of(um, dois), null, 2, 4));

        assertTrue(erro.getMessage().contains("no total"));
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

    private static MockMultipartFile pdf(String nome, String... paginas) {
        return new MockMultipartFile("files", nome, "application/pdf", PdfDeTeste.comPaginas(paginas));
    }

    /**
     * Arquivo que mente o tamanho e explode se alguem ler o conteudo. Serve para
     * provar que a recusa acontece antes de carregar qualquer byte na memoria.
     */
    private static MultipartFile pesadoDemais(String nome, long bytes) {
        return new MockMultipartFile("files", nome, "application/pdf", new byte[]{1}) {
            @Override
            public long getSize() {
                return bytes;
            }

            @Override
            public byte[] getBytes() {
                throw new AssertionError("nao pode ler o conteudo de um arquivo ja recusado");
            }
        };
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
