package com.trainify.lms.ai;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;

/** Monta PDFs de verdade (uma pagina por texto) para os testes de extracao. */
final class PdfDeTeste {

    private PdfDeTeste() {
    }

    static byte[] comPaginas(String... paginas) {
        try (PDDocument documento = new PDDocument(); ByteArrayOutputStream saida = new ByteArrayOutputStream()) {
            PDType1Font fonte = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            for (String texto : paginas) {
                PDPage pagina = new PDPage();
                documento.addPage(pagina);
                if (texto.isEmpty()) {
                    continue; // pagina so com imagem, como num PDF escaneado
                }
                try (PDPageContentStream conteudo = new PDPageContentStream(documento, pagina)) {
                    conteudo.beginText();
                    conteudo.setFont(fonte, 12);
                    conteudo.newLineAtOffset(50, 700);
                    conteudo.showText(texto);
                    conteudo.endText();
                }
            }
            documento.save(saida);
            return saida.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }
}
