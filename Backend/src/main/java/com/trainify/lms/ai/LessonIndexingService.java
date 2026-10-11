package com.trainify.lms.ai;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Base64;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.trainify.lms.domain.entities.Lesson;
import com.trainify.lms.domain.entities.MediaAsset;
import com.trainify.lms.domain.entities.Module;
import com.trainify.lms.domain.enums.MediaProvider;
import com.trainify.lms.repositories.LessonRepository;
import com.trainify.lms.repositories.ModuleRepository;
import com.trainify.lms.services.S3Service;

import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Mantem o indice do servico de IA igual ao conteudo das aulas: texto escrito
 * pelo instrutor, transcricao do video e PDF enviado. Quem dispara e o
 * {@link AiIndexListener}, a partir dos eventos do cadastro de cursos.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LessonIndexingService {

    static final long LIMITE_PDF_BYTES = 50L * 1024 * 1024;

    private final TrainifyAiClient ai;
    private final LessonRepository lessonRepository;
    private final ModuleRepository moduleRepository;
    private final S3Service s3Service;

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    // ── operacoes ──

    /**
     * Envia o conteudo atual da aula para o indice. Aula sem conteudo (ex.: quiz)
     * sai do indice.
     *
     * @return true se algum conteudo foi indexado
     */
    @Transactional(readOnly = true)
    public boolean indexar(UUID lessonId) {
        Lesson lesson = lessonRepository.findById(lessonId).orElse(null);
        if (lesson == null) {
            return false; // excluida antes do evento ser tratado
        }

        TrainifyAiClient.IngestRequest pedido = montarPedido(lesson);
        String courseId = lesson.getModule().getCourse().getId().toString();

        if (pedido == null) {
            ai.removeLesson(courseId, lessonId.toString());
            return false;
        }

        try {
            ai.ingestLesson(lessonId.toString(), pedido);
            log.info("Aula {} indexada no servico de IA", lessonId);
            return true;
        } catch (FeignException.UnprocessableEntity e) {
            // Ex.: PDF escaneado, sem texto. Nao e erro do sistema, so nao ha o que indexar.
            log.warn("Aula {} sem texto aproveitavel para a IA: {}", lessonId, e.contentUTF8());
            return false;
        }
    }

    /**
     * Reindexa todas as aulas do curso (cursos criados antes da IA, ou depois de uma falha).
     *
     * @return quantas aulas tinham conteudo e foram indexadas
     */
    @Transactional(readOnly = true)
    public int reindexarCurso(UUID courseId) {
        int quantidade = 0;
        for (Module module : moduleRepository.findByCourseIdOrderByOrderIndexAsc(courseId)) {
            for (Lesson lesson : lessonRepository.findByModuleIdOrderByOrderIndexAsc(module.getId())) {
                try {
                    if (indexar(lesson.getId())) {
                        quantidade++;
                    }
                } catch (FeignException e) {
                    // Uma aula com problema nao impede as outras
                    log.warn("Falha ao reindexar a aula {}: {}", lesson.getId(), e.getMessage());
                }
            }
        }
        return quantidade;
    }

    // ── apoio ──

    TrainifyAiClient.IngestRequest montarPedido(Lesson lesson) {
        MediaAsset media = lesson.getVideoAsset();
        String transcricao = media == null ? null : media.getTranscript();
        String pdf = pdfEmBase64(media);

        boolean semConteudo = vazio(lesson.getContent()) && vazio(transcricao) && pdf == null;
        if (semConteudo) {
            return null;
        }

        Module module = lesson.getModule();
        return new TrainifyAiClient.IngestRequest(
                module.getCourse().getId().toString(),
                lesson.getTitle(),
                lesson.getTenant() == null ? null : lesson.getTenant().getId().toString(),
                module.getId().toString(),
                module.getTitle(),
                lesson.getContent(),
                transcricao,
                pdf);
    }

    /**
     * O PDF e baixado pelo proprio backend (pelo link temporario do S3) e enviado
     * junto. Assim o servico de IA nao precisa de acesso ao bucket.
     */
    private String pdfEmBase64(MediaAsset media) {
        if (media == null || media.getProvider() != MediaProvider.S3 || media.getS3Key() == null
                || !"application/pdf".equalsIgnoreCase(media.getMimeType())) {
            return null;
        }
        if (media.getFileSize() != null && media.getFileSize() > LIMITE_PDF_BYTES) {
            log.warn("PDF {} maior que {} MB: nao sera indexado", media.getId(), LIMITE_PDF_BYTES / 1024 / 1024);
            return null;
        }

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
                if (bytes.length > LIMITE_PDF_BYTES) {
                    log.warn("PDF {} maior que o limite: nao sera indexado", media.getId());
                    return null;
                }
                return Base64.getEncoder().encodeToString(bytes);
            }
        } catch (IOException e) {
            log.warn("Falha ao baixar o PDF {} para a IA: {}", media.getId(), e.getMessage());
            return null;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return null;
        }
    }

    private static boolean vazio(String texto) {
        return texto == null || texto.isBlank();
    }
}
