package com.trainify.lms.ai;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.trainify.lms.domain.entities.Course;
import com.trainify.lms.domain.enums.CourseStatus;
import com.trainify.lms.repositories.CourseRepository;

@ExtendWith(MockitoExtension.class)
class AiIndexSyncTest {

    @Mock private TrainifyAiClient ai;
    @Mock private CourseRepository courseRepository;
    @Mock private LessonIndexingService indexing;

    @InjectMocks private AiIndexSync sync;

    @Test
    void reindexaSoOsCursosQueSumiramDoIndice() {
        Course indexado = curso(CourseStatus.PUBLISHED);
        Course apagado = curso(CourseStatus.PUBLISHED);
        Course arquivado = curso(CourseStatus.ARCHIVED);
        when(ai.indexedCourses()).thenReturn(new TrainifyAiClient.IndexedCourses(List.of(indexado.getId().toString())));
        when(courseRepository.findAll()).thenReturn(List.of(indexado, apagado, arquivado));

        sync.sincronizar();

        verify(indexing).reindexarCurso(apagado.getId());
        verify(indexing, never()).reindexarCurso(indexado.getId());
        verify(indexing, never()).reindexarCurso(arquivado.getId());
    }

    @Test
    void comAIaForaDoArNaoFazNadaETentaDepois() {
        when(ai.indexedCourses()).thenThrow(new RuntimeException("Connection refused"));

        sync.sincronizar();

        verify(courseRepository, never()).findAll();
        verify(indexing, never()).reindexarCurso(any());
    }

    private static Course curso(CourseStatus status) {
        Course c = new Course();
        c.setId(UUID.randomUUID());
        c.setStatus(status);
        return c;
    }
}
