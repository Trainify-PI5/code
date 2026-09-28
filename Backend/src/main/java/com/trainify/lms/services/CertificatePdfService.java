package com.trainify.lms.services;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.color.PDColor;
import org.apache.pdfbox.pdmodel.graphics.color.PDDeviceRGB;
import org.springframework.stereotype.Service;

/**
 * Monta o certificado em PDF, em uma pagina A4 deitada. Nada e gravado em disco:
 * o arquivo é devolvido em memoria para o navegador baixar.
 */
@Service
public class CertificatePdfService {

    private static final DateTimeFormatter DATA = DateTimeFormatter
            .ofPattern("dd 'de' MMMM 'de' yyyy", new Locale("pt", "BR"))
            .withZone(ZoneId.of("America/Sao_Paulo"));

    private static final PDColor ROXO = new PDColor(new float[]{0.29f, 0.17f, 0.57f}, PDDeviceRGB.INSTANCE);
    private static final PDColor CINZA = new PDColor(new float[]{0.35f, 0.35f, 0.40f}, PDDeviceRGB.INSTANCE);
    private static final PDColor PRETO = new PDColor(new float[]{0.10f, 0.10f, 0.12f}, PDDeviceRGB.INSTANCE);

    public byte[] generate(String studentName, String courseTitle, String companyName,
                           Integer score, Instant issuedAt, UUID certificateId) throws IOException {

        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(new PDRectangle(PDRectangle.A4.getHeight(), PDRectangle.A4.getWidth()));
            document.addPage(page);

            float width = page.getMediaBox().getWidth();
            float height = page.getMediaBox().getHeight();

            var titulo = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            var corpo = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            var nome = new PDType1Font(Standard14Fonts.FontName.TIMES_BOLD);

            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                // Moldura
                content.setStrokingColor(ROXO);
                content.setLineWidth(3);
                content.addRect(25, 25, width - 50, height - 50);
                content.stroke();

                content.setLineWidth(0.8f);
                content.addRect(35, 35, width - 70, height - 70);
                content.stroke();

                centralizado(content, titulo, 34, ROXO, "CERTIFICADO DE CONCLUSÃO", width, height - 120);
                centralizado(content, corpo, 13, CINZA, "Certificamos que", width, height - 180);
                centralizado(content, nome, 30, PRETO, studentName, width, height - 225);
                centralizado(content, corpo, 13, CINZA, "concluiu com aproveitamento o curso", width, height - 270);
                centralizado(content, titulo, 20, PRETO, courseTitle, width, height - 310);

                if (score != null) {
                    centralizado(content, corpo, 13, CINZA, "Aproveitamento final: " + score + "%", width, height - 350);
                }

                centralizado(content, corpo, 12, CINZA,
                        companyName + "  •  " + DATA.format(issuedAt), width, 150);

                // Linha de assinatura
                content.setStrokingColor(CINZA);
                content.setLineWidth(0.8f);
                content.moveTo(width / 2 - 120, 120);
                content.lineTo(width / 2 + 120, 120);
                content.stroke();
                centralizado(content, corpo, 11, CINZA, companyName, width, 100);

                centralizado(content, corpo, 8, CINZA,
                        "Código de verificação: " + certificateId, width, 60);
            }

            document.save(out);
            return out.toByteArray();
        }
    }

    private void centralizado(PDPageContentStream content, PDType1Font font, float size,
                              PDColor color, String text, float pageWidth, float y) throws IOException {
        String texto = text == null ? "" : text;
        float largura = font.getStringWidth(texto) / 1000 * size;

        content.beginText();
        content.setFont(font, size);
        content.setNonStrokingColor(color);
        content.newLineAtOffset((pageWidth - largura) / 2, y);
        content.showText(texto);
        content.endText();
    }
}
