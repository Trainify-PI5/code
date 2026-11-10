package com.trainify.lms.ai;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.trainify.lms.domain.entities.Lesson;
import com.trainify.lms.domain.entities.MediaAsset;
import com.trainify.lms.domain.enums.MediaProvider;
import com.trainify.lms.repositories.LessonRepository;
import com.trainify.lms.services.S3Service;

import lombok.extern.slf4j.Slf4j;

/**
 * Prepara o texto de cada aula para a IA: junta o texto escrito pelo instrutor,
 * a transcricao do video e o texto do PDF anexado, divide em trechos e grava em
 * {@link TrechoRepository}. Quem dispara e o {@link AiIndexListener} (ao salvar a
 * aula) e o {@link AiIndexSync} (aulas que ainda nao foram preparadas).
 *
 * <p>Nada aqui usa a LLM: e so extracao e divisao de texto.
 */
@Service
@Slf4j
public class LessonIndexingService {

    static final long LIMITE_PDF_BYTES = 50L * 1024 * 1024;
    /** ~480 mil caracteres por aula: o suficiente para apostilas grandes sem lotar o banco gratuito. */
    static final int MAX_TRECHOS_POR_AULA = 400;

    private final LessonRepository lessonRepository;
    private final TrechoRepository trechos;
    private final S3Service s3Service;
    private final TransactionTemplate leitura;

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    public LessonIndexingService(LessonRepository lessonRepository, TrechoRepository trechos, S3Service s3Service,
            PlatformTransactionManager transacoes) {
        this.lessonRepository = lessonRepository;
        this.trechos = trechos;
        this.s3Service = s3Service;
        this.leitura = new TransactionTemplate(transacoes);
        this.leitura.setReadOnly(true);
    }

    /** O que da aula interessa para a IA, lido do banco numa transacao curta. */
    record ConteudoDaAula(String titulo, String texto, String transcricao, MediaAsset pdf) {}

    /**
     * Le a aula e grava os trechos dela. O PDF e baixado fora de qualquer
     * transacao, para nao segurar uma conexao do banco durante o download.
     *
     * @return quantos trechos a aula ficou tendo (0 = aula sem texto, ex.: so video)
     */
    public int indexar(UUID lessonId) {
        ConteudoDaAula conteudo = leitura.execute(status -> lessonRepository.findById(lessonId)
                .map(LessonIndexingService::conteudo)
                .orElse(null));
        if (conteudo == null) {
            return 0; // excluida antes de o evento ser tratado
        }

        List<String> partes = new ArrayList<>();
        partes.add(conteudo.texto());
        partes.add(conteudo.transcricao());
        partes.add(textoDoPdf(conteudo.pdf()));

        List<String> novos = new ArrayList<>();
        for (String parte : partes) {
            for (String trecho : TextoIa.dividir(parte)) {
                if (novos.size() == MAX_TRECHOS_POR_AULA) {
                    break;
                }
                // O titulo em cada trecho ajuda a busca: "trabalho em altura" acha a
                // aula com esse nome mesmo que o paragrafo nao repita o termo.
                novos.add(conteudo.titulo() + "\n" + trecho);
            }
        }

        trechos.substituir(lessonId, novos);
        log.info("Aula {} preparada para a IA: {} trecho(s)", lessonId, novos.size());
        return novos.size();
    }

    static ConteudoDaAula conteudo(Lesson lesson) {
        MediaAsset media = lesson.getVideoAsset();
        boolean ehPdf = media != null && "application/pdf".equalsIgnoreCase(media.getMimeType());
        return new ConteudoDaAula(
                lesson.getTitle(),
                lesson.getContent(),
                media == null ? null : media.getTranscript(),
                ehPdf ? media : null);
    }

    /** Prepara as aulas que ainda nao passaram por aqui. */
    public int indexarPendentes(int limite) {
        int preparadas = 0;
        for (UUID aula : trechos.aulasPendentes(limite)) {
            try {
                indexar(aula);
                preparadas++;
            } catch (Exception e) {
                // Uma aula com problema nao impede as outras
                log.warn("Falha ao preparar a aula {} para a IA: {}", aula, e.getMessage());
            }
        }
        return preparadas;
    }

    /**
     * Baixa o PDF da aula pelo link temporario do S3 e extrai o texto. PDF
     * escaneado (so imagem) nao tem texto: a aula fica sem trechos de PDF.
     */
    String textoDoPdf(MediaAsset media) {
        if (media == null || media.getProvider() != MediaProvider.S3 || media.getS3Key() == null) {
            return null;
        }
        if (media.getFileSize() != null && media.getFileSize() > LIMITE_PDF_BYTES) {
            log.warn("PDF {} maior que {} MB: fica fora da IA", media.getId(), LIMITE_PDF_BYTES / 1024 / 1024);
            return null;
        }
        byte[] bytes = baixar(media);
        if (bytes == null) {
            return null;
        }
        try {
            return String.join("\n\n", TextoIa.paginasDoPdf(bytes));
        } catch (IllegalArgumentException e) {
            log.warn("PDF {} sem texto aproveitavel: {}", media.getId(), e.getMessage());
            return null;
        }
    }

    byte[] baixar(MediaAsset media) {
        try {
            HttpRequest pedido = HttpRequest.newBuilder(URI.create(s3Service.generatePresignedDownloadUrl(media.getS3Key())))
                    .timeout(Duration.ofSeconds(60)).GET().build();
            HttpResponse<InputStream> resposta = http.send(pedido, HttpResponse.BodyHandlers.ofInputStream());
            if (resposta.statusCode() != 200) {
                log.warn("Nao foi possivel baixar o PDF {} do S3 (HTTP {})", media.getId(), resposta.statusCode());
                return null;
            }
            try (InputStream corpo = resposta.body()) {
                byte[] bytes = corpo.readNBytes((int) LIMITE_PDF_BYTES + 1);
                return bytes.length > LIMITE_PDF_BYTES ? null : bytes;
            }
        } catch (IOException e) {
            log.warn("Falha ao baixar o PDF {}: {}", media.getId(), e.getMessage());
            return null;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return null;
        }
    }
}
