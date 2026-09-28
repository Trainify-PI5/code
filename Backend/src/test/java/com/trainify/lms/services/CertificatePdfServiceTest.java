package com.trainify.lms.services;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CertificatePdfServiceTest {

    private final CertificatePdfService service = new CertificatePdfService();

    @Test
    void geraUmPdfComOsDadosDoAluno() throws Exception {
        UUID certificado = UUID.randomUUID();

        byte[] pdf = service.generate(
                "Pedro Souza",
                "Integração de Novos Colaboradores",
                "NovaTech Logística",
                100,
                Instant.parse("2026-09-22T12:00:00Z"),
                certificado);

        // É mesmo um PDF, e não um arquivo vazio
        assertTrue(pdf.length > 1000, "PDF menor que o esperado: " + pdf.length + " bytes");
        assertEquals("%PDF", new String(pdf, 0, 4));

        try (PDDocument document = Loader.loadPDF(pdf)) {
            assertEquals(1, document.getNumberOfPages());

            String texto = new PDFTextStripper().getText(document);
            assertTrue(texto.contains("Pedro Souza"), texto);
            assertTrue(texto.contains("Integração de Novos Colaboradores"), texto);
            assertTrue(texto.contains("NovaTech Logística"), texto);
            assertTrue(texto.contains("100%"), texto);
            assertTrue(texto.contains("22 de setembro de 2026"), texto);
            assertTrue(texto.contains(certificado.toString()), texto);
        }
    }

    @Test
    void naoQuebraQuandoAlgumDadoFalta() throws Exception {
        byte[] pdf = service.generate("Aluno Sem Nota", "Curso", "Empresa", null,
                Instant.parse("2026-01-05T09:00:00Z"), UUID.randomUUID());

        try (PDDocument document = Loader.loadPDF(pdf)) {
            String texto = new PDFTextStripper().getText(document);
            assertTrue(texto.contains("Aluno Sem Nota"));
            assertTrue(texto.contains("05 de janeiro de 2026"));
        }
    }
}
