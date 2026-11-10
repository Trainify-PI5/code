package com.trainify.lms.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeSet;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.trainify.lms.domain.entities.CourseGenerationDraft;
import com.trainify.lms.domain.entities.CourseGenerationDraft.Status;
import com.trainify.lms.repositories.CourseGenerationDraftRepository;

class GeradorDeCursoTest {

    private static final String ESTRUTURA = """
            {"title": "Prevenção de incêndio", "description": "Curso sobre extintores e rotas de fuga.",
             "modules": [{"title": "Combate ao fogo", "objective": "Saber usar o extintor.",
               "lessons": [{"title": "Tipos de extintores", "topics": ["classes de fogo", "extintores"], "documents": ["manual.pdf"]},
                           {"title": "Rotas de fuga", "topics": ["saídas de emergência"], "documents": ["inexistente.pdf"]}]}]}""";

    private final CourseGenerationDraftRepository repository = mock(CourseGenerationDraftRepository.class);
    private final CourseGenerationDraft rascunho = new CourseGenerationDraft();
    private LlmFalsa modelo;
    private GeradorDeCurso gerador;

    private final List<GeradorDeCurso.Documento> documentos = List.of(new GeradorDeCurso.Documento("manual.pdf", List.of(
            "Introducao ao manual de seguranca da empresa.",
            "Extintores de agua servem para fogo classe A. Extintores de CO2 servem para classe C.",
            "Saidas de emergencia e rotas de fuga ficam sinalizadas."), true));

    @BeforeEach
    void preparar() {
        rascunho.setId(UUID.randomUUID());
        rascunho.setStatus(Status.PROCESSING);
        when(repository.findById(rascunho.getId())).thenReturn(Optional.of(rascunho));
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        modelo = new LlmFalsa();
        gerador = new GeradorDeCurso(modelo.llm(), LlmFalsa.propriedades(), repository);
        gerador.esperaPorLimiteMs = 1;
    }

    @Test
    @SuppressWarnings("unchecked")
    void montaAPropostaComAulasEscritasEFontes() {
        modelo.responde(ESTRUTURA, "## Extintores\nTexto da aula 1.", "## Rotas\nTexto da aula 2.");
        gerador.reservar();

        gerador.gerar(rascunho.getId(), documentos, 1, 3, null);

        assertEquals(Status.READY, rascunho.getStatus());
        assertEquals(100, rascunho.getProgress());
        Map<String, Object> proposta = rascunho.getProposal();
        assertEquals("Prevenção de incêndio", proposta.get("title"));
        Map<String, Object> modulo = CourseGenerationService.modulos(proposta).get(0);
        assertEquals("Saber usar o extintor.", modulo.get("objective"));
        Map<String, Object> aula = CourseGenerationService.aulas(modulo).get(0);
        assertEquals("## Extintores\nTexto da aula 1.", aula.get("content"));
        // A aula sai das paginas que falam de extintores
        List<Map<String, Object>> fontes = (List<Map<String, Object>>) aula.get("sources");
        assertEquals("manual.pdf", fontes.get(0).get("document"));
        assertEquals("2", fontes.get(0).get("pages"));

        // Estrutura (1 chamada) + uma chamada por aula
        assertEquals(3, modelo.recebidos.size());
        String pedidoDaAula = modelo.recebidos.get(1).getInstructions().get(1).getText();
        assertTrue(pedidoDaAula.contains("AULA: Tipos de extintores"));
        assertTrue(pedidoDaAula.contains("[manual.pdf, p. 2]"));
        // A vaga volta no fim
        assertTrue(gerador.reservar());
    }

    @Test
    void estruturaComMenosModulosQueOMinimoEPedidaDeNovo() {
        modelo.responde(ESTRUTURA, ESTRUTURA, ESTRUTURA, "aula 1", "aula 2");
        gerador.reservar();

        gerador.gerar(rascunho.getId(), documentos, 2, 3, null);

        // Veio 1 modulo (minimo 2): pede de novo; na ultima tentativa aceita o que veio
        assertEquals(Status.READY, rascunho.getStatus());
        String segundoPedido = modelo.recebidos.get(1).getInstructions().get(1).getText();
        assertTrue(segundoPedido.contains("vieram 1 módulos e o mínimo é 2"));
    }

    @Test
    void limiteDaGroqFazEsperarEContinuar() {
        modelo.responde(ESTRUTURA)
                .falha(new IaLimiteAtingido("limite"))
                .responde("aula 1", "aula 2");
        gerador.reservar();

        gerador.gerar(rascunho.getId(), documentos, 1, 3, null);

        assertEquals(Status.READY, rascunho.getStatus());
    }

    @Test
    void descartadoNoMeioParaSemSobrescrever() {
        modelo.responde(ESTRUTURA, "aula 1", "aula 2");
        // O instrutor descarta antes de a IA terminar
        rascunho.setStatus(Status.DISCARDED);
        gerador.reservar();

        gerador.gerar(rascunho.getId(), documentos, 1, 3, null);

        assertEquals(Status.DISCARDED, rascunho.getStatus());
        assertTrue(modelo.recebidos.isEmpty());
    }

    @Test
    void falhaDaIaVaiParaORascunho() {
        modelo.responde("nao e json", "nem isso", "de novo nao");
        gerador.reservar();

        gerador.gerar(rascunho.getId(), documentos, 1, 3, null);

        assertEquals(Status.FAILED, rascunho.getStatus());
        assertTrue(rascunho.getError().contains("planejar o curso"));
    }

    @Test
    void paginasViramIntervalos() {
        assertEquals("1-3, 5, 7-8", GeradorDeCurso.intervalos(new TreeSet<>(List.of(1, 2, 3, 5, 7, 8))));
        assertEquals("4", GeradorDeCurso.intervalos(new TreeSet<>(List.of(4))));
    }

    @Test
    void mapaTemAmostrasComAPagina() {
        String mapa = GeradorDeCurso.mapa(documentos, GeradorDeCurso.pedacos(documentos));
        assertTrue(mapa.contains("=== Documento: manual.pdf ==="));
        assertTrue(mapa.contains("[p. 2] Extintores de agua"));
    }
}
