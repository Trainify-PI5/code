package com.trainify.lms.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import com.trainify.lms.domain.entities.Course;
import com.trainify.lms.domain.entities.Lesson;
import com.trainify.lms.domain.entities.MediaAsset;
import com.trainify.lms.domain.entities.Module;
import com.trainify.lms.domain.entities.Tenant;
import com.trainify.lms.domain.enums.MediaProvider;
import com.trainify.lms.repositories.LessonRepository;
import com.trainify.lms.repositories.ModuleRepository;
import com.trainify.lms.services.S3Service;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class LessonIndexingServiceTest {

    @Mock private TrainifyAiClient ai;
    @Mock private LessonRepository lessonRepository;
    @Mock private ModuleRepository moduleRepository;
    @Mock private S3Service s3Service;

    @InjectMocks private LessonIndexingService indexing;

    @Test
    void enviaTextoTranscricaoEOsDadosDoCurso() {
        Lesson aula = aula("<p>Use sempre o capacete.</p>");
        MediaAsset video = new MediaAsset();
        video.setProvider(MediaProvider.YOUTUBE);
        video.setMimeType("application/vnd.trainify.external");
        video.setTranscript("Neste vídeo mostramos o capacete.");
        aula.setVideoAsset(video);
        when(lessonRepository.findById(aula.getId())).thenReturn(Optional.of(aula));

        indexing.indexar(aula.getId());

        ArgumentCaptor<TrainifyAiClient.IngestRequest> pedido = ArgumentCaptor.forClass(TrainifyAiClient.IngestRequest.class);
        verify(ai).ingestLesson(org.mockito.ArgumentMatchers.eq(aula.getId().toString()), pedido.capture());
        Module modulo = aula.getModule();
        assertEquals(modulo.getCourse().getId().toString(), pedido.getValue().courseId());
        assertEquals(modulo.getId().toString(), pedido.getValue().moduleId());
        assertEquals(aula.getTenant().getId().toString(), pedido.getValue().tenantId());
        assertEquals("<p>Use sempre o capacete.</p>", pedido.getValue().content());
        assertEquals("Neste vídeo mostramos o capacete.", pedido.getValue().transcript());
        assertNull(pedido.getValue().pdfBase64(), "video externo nao tem PDF para baixar");
        verify(s3Service, never()).generatePresignedDownloadUrl(anyString());
    }

    @Test
    void aulaSemConteudoSaiDoIndice() {
        Lesson quiz = aula(null);
        quiz.setLessonType("QUIZ");
        when(lessonRepository.findById(quiz.getId())).thenReturn(Optional.of(quiz));

        indexing.indexar(quiz.getId());

        verify(ai).removeLesson(quiz.getModule().getCourse().getId().toString(), quiz.getId().toString());
        verify(ai, never()).ingestLesson(anyString(), any());
    }

    @Test
    void aulaJaExcluidaNaoFazNada() {
        UUID id = UUID.randomUUID();
        when(lessonRepository.findById(id)).thenReturn(Optional.empty());

        indexing.indexar(id);

        verify(ai, never()).ingestLesson(anyString(), any());
        verify(ai, never()).removeLesson(anyString(), anyString());
    }

    @Test
    void pdfGrandeDemaisNaoEhBaixado() {
        Lesson aula = aula("Resumo da aula.");
        MediaAsset pdf = new MediaAsset();
        pdf.setProvider(MediaProvider.S3);
        pdf.setS3Key("tenant/curso/manual.pdf");
        pdf.setMimeType("application/pdf");
        pdf.setFileSize(LessonIndexingService.LIMITE_PDF_BYTES + 1);
        aula.setVideoAsset(pdf);

        TrainifyAiClient.IngestRequest pedido = indexing.montarPedido(aula);

        assertNull(pedido.pdfBase64());
        assertEquals("Resumo da aula.", pedido.content());
        verify(s3Service, never()).generatePresignedDownloadUrl(anyString());
    }

    private static Lesson aula(String conteudo) {
        Tenant empresa = new Tenant();
        empresa.setId(UUID.randomUUID());
        Course curso = new Course();
        curso.setId(UUID.randomUUID());
        Module modulo = new Module();
        modulo.setId(UUID.randomUUID());
        modulo.setTitle("Proteção individual");
        modulo.setCourse(curso);
        Lesson aula = new Lesson();
        aula.setId(UUID.randomUUID());
        aula.setTitle("Uso do capacete");
        aula.setContent(conteudo);
        aula.setModule(modulo);
        aula.setTenant(empresa);
        return aula;
    }
}
