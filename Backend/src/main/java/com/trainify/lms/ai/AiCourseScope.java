package com.trainify.lms.ai;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.trainify.lms.domain.entities.Course;
import com.trainify.lms.domain.entities.Lesson;
import com.trainify.lms.domain.enums.Role;
import com.trainify.lms.repositories.CourseRepository;
import com.trainify.lms.repositories.EnrollmentRepository;
import com.trainify.lms.repositories.LessonRepository;
import com.trainify.lms.security.CustomUserDetails;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

/**
 * Decide quais cursos a IA pode consultar para quem esta perguntando. O servico
 * de IA so busca nos cursos desta lista, entao e aqui que fica o isolamento
 * entre alunos, instrutores e empresas.
 *
 * <ul>
 *   <li>Aluno: cursos em que esta matriculado.</li>
 *   <li>Instrutor: cursos que ministra e cursos em que esta matriculado.</li>
 *   <li>Gestor e administrador: todos os cursos da empresa.</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
public class AiCourseScope {

    /** Ordem de precedencia quando o usuario tem mais de um papel. */
    private static final List<Role> PRECEDENCIA = List.of(
            Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.INSTRUCTOR, Role.STUDENT);

    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final LessonRepository lessonRepository;

    public record Escopo(Role role, List<String> courseIds, String lessonId) {}

    /**
     * @param lessonId aula aberta na tela (opcional): os trechos dela ganham prioridade
     * @param courseId curso aberto na tela (opcional): restringe a busca a ele
     */
    @Transactional(readOnly = true)
    public Escopo resolver(UUID lessonId, UUID courseId) {
        CustomUserDetails usuario = usuarioAtual();
        Role role = papelDe(usuario);
        Set<UUID> permitidos = cursosPermitidos(usuario, role);

        if (lessonId != null) {
            Lesson lesson = lessonRepository.findById(lessonId)
                    .orElseThrow(() -> new EntityNotFoundException("Aula não encontrada"));
            UUID cursoDaAula = lesson.getModule().getCourse().getId();
            if (!permitidos.contains(cursoDaAula)) {
                // Mesma resposta de "nao existe" para nao revelar aulas de outros cursos
                throw new EntityNotFoundException("Aula não encontrada");
            }
            courseId = courseId == null ? cursoDaAula : courseId;
        }

        if (courseId != null) {
            if (!permitidos.contains(courseId)) {
                throw new AccessDeniedException("Você não tem acesso a este curso.");
            }
            permitidos = Set.of(courseId);
        }

        List<String> ids = new ArrayList<>();
        permitidos.forEach(id -> ids.add(id.toString()));
        return new Escopo(role, ids, lessonId == null ? null : lessonId.toString());
    }

    Set<UUID> cursosPermitidos(CustomUserDetails usuario, Role role) {
        UUID empresa = usuario.getTenantId();
        Set<UUID> cursos = new LinkedHashSet<>();

        switch (role) {
            case SUPER_ADMIN, ADMIN, MANAGER -> {
                // Sem empresa identificada nao ha escopo seguro: nao devolver nada e
                // melhor do que devolver a plataforma inteira
                if (empresa != null) {
                    courseRepository.findByTenantId(empresa).forEach(c -> cursos.add(c.getId()));
                }
            }
            case INSTRUCTOR -> {
                courseRepository.findByInstructorId(usuario.getId()).forEach(c -> cursos.add(c.getId()));
                matriculas(usuario, cursos);
            }
            default -> matriculas(usuario, cursos);
        }
        return cursos;
    }

    private void matriculas(CustomUserDetails usuario, Set<UUID> cursos) {
        if (usuario.getTenantId() == null) {
            return;
        }
        enrollmentRepository.findByUserId(usuario.getId()).stream()
                .filter(m -> m.getCourse().getTenant().getId().equals(usuario.getTenantId()))
                .forEach(m -> cursos.add(m.getCourse().getId()));
    }

    static Role papelDe(CustomUserDetails usuario) {
        Set<String> autoridades = new LinkedHashSet<>();
        for (GrantedAuthority a : usuario.getAuthorities()) {
            autoridades.add(a.getAuthority());
        }
        return PRECEDENCIA.stream()
                .filter(r -> autoridades.contains("ROLE_" + r.name()))
                .findFirst()
                .orElse(Role.STUDENT);
    }

    private static CustomUserDetails usuarioAtual() {
        var autenticacao = SecurityContextHolder.getContext().getAuthentication();
        if (autenticacao == null || !(autenticacao.getPrincipal() instanceof CustomUserDetails usuario)) {
            throw new AccessDeniedException("Usuário não autenticado");
        }
        return usuario;
    }
}
