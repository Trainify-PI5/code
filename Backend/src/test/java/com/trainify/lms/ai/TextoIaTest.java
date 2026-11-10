package com.trainify.lms.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;

class TextoIaTest {

    @Test
    void textoCurtoViraUmTrechoSo() {
        assertEquals(List.of("Use o capacete."), TextoIa.dividir("  Use o capacete.  "));
        assertTrue(TextoIa.dividir("   ").isEmpty());
        assertTrue(TextoIa.dividir(null).isEmpty());
    }

    @Test
    void textoLongoEDivididoNoFimDeFraseComSobreposicao() {
        StringBuilder texto = new StringBuilder();
        for (int i = 1; i <= 60; i++) {
            texto.append("Frase numero ").append(i).append(" sobre o uso correto do equipamento. ");
        }

        List<String> trechos = TextoIa.dividir(texto.toString(), 300, 60);

        assertTrue(trechos.size() > 5);
        for (String trecho : trechos) {
            assertTrue(trecho.length() <= 300, "trecho passou do tamanho: " + trecho.length());
        }
        // O corte cai no fim de uma frase, nao no meio de uma palavra
        assertTrue(trechos.get(0).endsWith("."));
        // O trecho seguinte repete o fim do anterior
        String fimDoPrimeiro = trechos.get(0).substring(trechos.get(0).length() - 20);
        assertTrue(trechos.get(1).contains(fimDoPrimeiro.strip()) || trechos.get(1).startsWith("Frase"));
        // Nada se perde: a ultima frase esta no ultimo trecho
        assertTrue(trechos.get(trechos.size() - 1).contains("Frase numero 60"));
    }

    @Test
    void consultaTiraPalavrasVaziasEPontuacao() {
        assertEquals("altura | obrigatório | usar | cinto",
                TextoIa.consultaTextual("Qual a altura em que é obrigatório usar o cinto? Para que?"));
        assertNull(TextoIa.consultaTextual("Oi, tudo bem?"));
        assertNull(TextoIa.consultaTextual("Resuma esta aula"));
        // So letras e numeros: nada que quebre a sintaxe do to_tsquery
        assertEquals("nr35 | exige", TextoIa.consultaTextual("NR35 & exige ' | !"));
    }

    @Test
    void pontuacaoContaPalavrasSemLigarParaAcentoEPlural() {
        List<String> palavras = TextoIa.palavrasChave("treinamento de proteção", 10);
        assertEquals(2, TextoIa.pontuar("Os treinamentos de protecao sao anuais.", palavras));
        assertEquals(0, TextoIa.pontuar("Assunto diferente.", palavras));
    }

    @Test
    void extraiOTextoDeCadaPaginaDoPdf() {
        byte[] pdf = PdfDeTeste.comPaginas("Primeira pagina do manual", "", "Terceira pagina");

        List<String> paginas = TextoIa.paginasDoPdf(pdf);

        assertEquals(3, paginas.size());
        assertEquals("Primeira pagina do manual", paginas.get(0));
        assertEquals("", paginas.get(1));
        assertEquals("Terceira pagina", paginas.get(2));
    }

    @Test
    void pdfCorrompidoTemMensagemClara() {
        IllegalArgumentException erro = assertThrows(IllegalArgumentException.class,
                () -> TextoIa.paginasDoPdf("%PDF-1.4 isto nao e um pdf".getBytes()));
        assertTrue(erro.getMessage().contains("PDF"));
    }
}
