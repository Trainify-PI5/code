package com.trainify.lms.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.trainify.lms.ai.TrechoRepository.Trecho;

class GeradorDeQuizTest {

    private static final String UMA_PERGUNTA_OK = """
            {"title": "EPI", "questions": [{"text": "Quem fornece o EPI?", "explanation": "O empregador.",
             "options": [{"text": "O empregador", "isCorrect": true}, {"text": "O trabalhador", "isCorrect": false},
              {"text": "O sindicato", "isCorrect": false}, {"text": "O fabricante", "isCorrect": false}]}]}""";

    private static final String DUAS_CORRETAS = """
            {"title": "EPI", "questions": [{"text": "Quem fornece o EPI?", "explanation": "",
             "options": [{"text": "O empregador", "isCorrect": true}, {"text": "O trabalhador", "isCorrect": true},
              {"text": "O sindicato", "isCorrect": false}, {"text": "O fabricante", "isCorrect": false}]}]}""";

    private final List<Trecho> material = List.of(
            new Trecho(UUID.randomUUID(), "Segurança", UUID.randomUUID(), "Uso do EPI", 0, "O empregador fornece o EPI."));

    @Test
    void pedeDeNovoDizendoOQueCorrigir() {
        LlmFalsa modelo = new LlmFalsa().responde(DUAS_CORRETAS, UMA_PERGUNTA_OK);

        GeradorDeQuiz.Quiz quiz = new GeradorDeQuiz(modelo.llm(), LlmFalsa.propriedades()).gerar(material, 1, 4, null);

        assertEquals(1, quiz.questions().size());
        assertEquals(2, modelo.recebidos.size());
        String segundoPedido = modelo.ultimo().getInstructions().get(1).getText();
        assertTrue(segundoPedido.contains("precisa de exatamente 1 alternativa correta (tem 2)"));
    }

    @Test
    void desisteDepoisDasTentativas() {
        LlmFalsa modelo = new LlmFalsa().responde(DUAS_CORRETAS, DUAS_CORRETAS, "nao e json");

        assertThrows(AiUnavailableException.class,
                () -> new GeradorDeQuiz(modelo.llm(), LlmFalsa.propriedades()).gerar(material, 1, 4, null));
        assertEquals(GeradorDeQuiz.MAX_TENTATIVAS, modelo.recebidos.size());
    }

    @Test
    void validacaoPegaOsErrosComuns() {
        List<String> problemas = new ArrayList<>();
        GeradorDeQuiz.validar("""
                {"questions": [
                 {"text": "A", "options": [{"text": "x", "isCorrect": true}, {"text": "x", "isCorrect": false}]},
                 {"text": "B", "options": [{"text": "Todas as anteriores", "isCorrect": true}, {"text": "y", "isCorrect": false}]},
                 {"text": "C", "options": [{"text": "z", "isCorrect": true}]},
                 {"text": "D", "options": [{"text": "z", "isCorrect": "sim"}, {"text": "w", "isCorrect": false}]}
                ]}""", 4, 2, new ArrayList<>(), problemas);

        assertEquals(4, problemas.size(), problemas.toString());
        assertTrue(problemas.get(0).contains("alternativas repetidas"));
        assertTrue(problemas.get(1).contains("todas/nenhuma"));
        assertTrue(problemas.get(2).contains("exatamente 2 alternativas"));
        assertTrue(problemas.get(3).contains("isCorrect"));
    }

    @Test
    void verdadeiroOuFalsoERecusado() {
        List<String> problemas = new ArrayList<>();
        GeradorDeQuiz.validar("""
                {"questions": [{"text": "O empregador fornece o EPI", "options": [
                 {"text": "Verdadeiro", "isCorrect": true}, {"text": "Falso, o trabalhador compra", "isCorrect": false}]}]}""",
                1, 2, new ArrayList<>(), problemas);
        assertTrue(problemas.get(0).contains("verdadeiro ou falso"));
    }

    @Test
    void faltaDePerguntasEProblema() {
        List<String> problemas = new ArrayList<>();
        GeradorDeQuiz.validar(UMA_PERGUNTA_OK, 3, 4, new ArrayList<>(), problemas);
        assertEquals(List.of("foram pedidas 3 perguntas e vieram 1"), problemas);
    }

    @Test
    void jsonEmbrulhadoEmBlocoDeCodigoEAceito() {
        List<GeradorDeQuiz.Pergunta> saida = new ArrayList<>();
        List<String> problemas = new ArrayList<>();
        String titulo = GeradorDeQuiz.validar("```json\n" + UMA_PERGUNTA_OK + "\n```", 1, 4, saida, problemas);
        assertTrue(problemas.isEmpty());
        assertEquals("EPI", titulo);
    }

    @Test
    void comTemaOsTrechosQueFalamDeleVemPrimeiro() {
        Trecho outro = new Trecho(UUID.randomUUID(), "C", UUID.randomUUID(), "A", 0, "Assunto qualquer.");
        Trecho extintor = new Trecho(UUID.randomUUID(), "C", UUID.randomUUID(), "B", 1, "Tipos de extintores de incêndio.");
        List<Trecho> escolhidos = GeradorDeQuiz.selecionar(List.of(outro, extintor), "extintores");
        assertEquals(extintor, escolhidos.get(0));
    }
}
