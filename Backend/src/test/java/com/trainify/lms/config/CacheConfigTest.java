package com.trainify.lms.config;

import com.trainify.lms.domain.enums.CourseStatus;
import com.trainify.lms.dto.CourseDto;
import com.trainify.lms.dto.LessonDto;
import com.trainify.lms.dto.ModuleDto;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * A lista de cursos publicados e guardada em cache. Com a serializacao padrao do
 * Java isso quebrava com 500, porque os DTOs nao sao Serializable.
 */
class CacheConfigTest {

    @Test
    @SuppressWarnings("unchecked")
    void listaDeCursosVaiEVoltaDoCacheSemPerderNada() {
        var pair = new CacheConfig().cacheConfiguration().getValueSerializationPair();

        LessonDto lesson = new LessonDto();
        lesson.setId(UUID.randomUUID());
        lesson.setTitle("Bem-vindo à NovaTech");
        lesson.setLessonType("VIDEO");
        lesson.setDurationSeconds(19);

        ModuleDto module = new ModuleDto();
        module.setId(UUID.randomUUID());
        module.setTitle("Módulo 1: Boas-vindas");
        module.setLessons(new java.util.ArrayList<>(List.of(lesson)));

        CourseDto course = new CourseDto();
        course.setId(UUID.randomUUID());
        course.setTitle("Integração de Novos Colaboradores");
        course.setDescription("Primeiros passos na empresa");
        course.setStatus(CourseStatus.PUBLISHED);
        course.setModules(new java.util.ArrayList<>(List.of(module)));

        // O servico devolve o resultado de Collectors.toList(), ou seja, um ArrayList
        java.nio.ByteBuffer bytes = pair.write(new java.util.ArrayList<>(List.of(course)));
        assertNotNull(bytes);

        List<CourseDto> voltou = (List<CourseDto>) pair.read(bytes);

        assertEquals(1, voltou.size());
        CourseDto cursoVolta = voltou.get(0);
        assertEquals(course.getId(), cursoVolta.getId());
        assertEquals("Integração de Novos Colaboradores", cursoVolta.getTitle());
        assertEquals(CourseStatus.PUBLISHED, cursoVolta.getStatus());
        assertEquals(1, cursoVolta.getModules().size());
        assertEquals("VIDEO", cursoVolta.getModules().get(0).getLessons().get(0).getLessonType());
        assertEquals(19, cursoVolta.getModules().get(0).getLessons().get(0).getDurationSeconds());
    }
}
