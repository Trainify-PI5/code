package com.trainify.lms.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.transaction.PlatformTransactionManager;

import com.trainify.lms.domain.entities.Lesson;
import com.trainify.lms.domain.entities.MediaAsset;
import com.trainify.lms.domain.enums.MediaProvider;
import com.trainify.lms.repositories.LessonRepository;
import com.trainify.lms.services.S3Service;

class LessonIndexingServiceTest {

    private final LessonRepository lessonRepository = mock(LessonRepository.class);
    private final TrechoRepository trechos = mock(TrechoRepository.class);
    private final S3Service s3 = mock(S3Service.class);
    private LessonIndexingService service;

    @BeforeEach
    void preparar() {
        service = spy(new LessonIndexingService(lessonRepository, trechos, s3, mock(PlatformTransactionManager.class)));
    }

    @Test
    void textoETranscricaoViramTrechosComOTituloDaAula() {
        Lesson aula = aula("Uso do EPI", "O empregador fornece o EPI.");
        MediaAsset video = new MediaAsset();
        video.setMimeType("video/mp4");
        video.setTranscript("Nesta aula vamos falar de luvas.");
        aula.setVideoAsset(video);

        int total = service.indexar(aula.getId());

        List<String> gravados = gravados(aula.getId());
        assertEquals(2, total);
        assertEquals(List.of("Uso do EPI\nO empregador fornece o EPI.", "Uso do EPI\nNesta aula vamos falar de luvas."), gravados);
    }

    @Test
    void textoDoPdfAnexadoEntraNaAula() {
        Lesson aula = aula("Manual", null);
        MediaAsset pdf = new MediaAsset();
        pdf.setId(UUID.randomUUID());
        pdf.setMimeType("application/pdf");
        pdf.setProvider(MediaProvider.S3);
        pdf.setS3Key("cursos/manual.pdf");
        aula.setVideoAsset(pdf);
        doReturn(PdfDeTeste.comPaginas("Capitulo 1 Extintores", "Capitulo 2 Rotas de fuga")).when(service).baixar(pdf);

        service.indexar(aula.getId());

        String gravado = String.join(" ", gravados(aula.getId()));
        assertTrue(gravado.contains("Capitulo 1 Extintores"));
        assertTrue(gravado.contains("Capitulo 2 Rotas de fuga"));
    }

    /** Aula so de video fica registrada com zero trechos, para nao ser tentada de novo a cada rodada. */
    @Test
    void aulaSemTextoFicaRegistradaSemTrechos() {
        Lesson aula = aula("Vídeo de boas-vindas", null);

        assertEquals(0, service.indexar(aula.getId()));
        verify(trechos).substituir(aula.getId(), List.of());
    }

    @Test
    void aulaExcluidaAntesDoEventoNaoGravaNada() {
        UUID sumiu = UUID.randomUUID();
        when(lessonRepository.findById(sumiu)).thenReturn(Optional.empty());

        assertEquals(0, service.indexar(sumiu));
        verify(trechos, never()).substituir(any(), anyList());
    }

    @Test
    void pendentesSaoPreparadasEUmaFalhaNaoParaAsOutras() {
        Lesson boa = aula("Boa", "Texto.");
        UUID ruim = UUID.randomUUID();
        when(lessonRepository.findById(ruim)).thenThrow(new IllegalStateException("banco fora"));
        when(trechos.aulasPendentes(20)).thenReturn(List.of(ruim, boa.getId()));

        assertEquals(1, service.indexarPendentes(20));
        verify(trechos).substituir(eq(boa.getId()), anyList());
    }

    // ── apoio ──

    private Lesson aula(String titulo, String texto) {
        Lesson aula = new Lesson();
        aula.setId(UUID.randomUUID());
        aula.setTitle(titulo);
        aula.setContent(texto);
        when(lessonRepository.findById(aula.getId())).thenReturn(Optional.of(aula));
        return aula;
    }

    @SuppressWarnings("unchecked")
    private List<String> gravados(UUID aula) {
        ArgumentCaptor<List<String>> lista = ArgumentCaptor.forClass(List.class);
        verify(trechos).substituir(eq(aula), lista.capture());
        return lista.getValue();
    }
}
