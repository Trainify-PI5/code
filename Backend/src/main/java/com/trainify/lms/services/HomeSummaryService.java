package com.trainify.lms.services;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.trainify.lms.domain.enums.CourseStatus;
import com.trainify.lms.domain.enums.EnrollmentStatus;
import com.trainify.lms.domain.enums.ProgressStatus;
import com.trainify.lms.domain.enums.Role;
import com.trainify.lms.dto.HomeSummaryDto;
import com.trainify.lms.repositories.CertificationRepository;
import com.trainify.lms.repositories.CompanyInvitationRepository;
import com.trainify.lms.repositories.CourseRepository;
import com.trainify.lms.repositories.EnrollmentRepository;
import com.trainify.lms.repositories.LessonProgressRepository;
import com.trainify.lms.repositories.LessonRepository;
import com.trainify.lms.repositories.TenantRepository;
import com.trainify.lms.repositories.UserRepository;
import com.trainify.lms.security.CustomUserDetails;

import lombok.RequiredArgsConstructor;

/**
 * O que cada perfil precisa ver ao entrar. Antes a tela inicial era a mesma para
 * todo mundo e falava de "suas atividades de aprendizado" ate para quem
 * administra a empresa.
 */
@Service
@RequiredArgsConstructor
public class HomeSummaryService {

    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final CertificationRepository certificationRepository;
    private final CompanyInvitationRepository invitationRepository;
    private final TenantRepository tenantRepository;
    private final LessonRepository lessonRepository;
    private final LessonProgressRepository lessonProgressRepository;

    @Transactional(readOnly = true)
    public HomeSummaryDto summaryFor(CustomUserDetails usuario) {
        Role papel = papelDe(usuario);
        UUID tenantId = usuario.getTenantId();

        HomeSummaryDto resumo = new HomeSummaryDto();
        resumo.setRole(papel.name());
        resumo.setUserName(usuario.getName());

        switch (papel) {
            case SUPER_ADMIN -> plataforma(resumo, tenantId);
            case ADMIN -> empresa(resumo, tenantId);
            case MANAGER -> equipe(resumo, tenantId);
            case INSTRUCTOR -> producao(resumo, tenantId, usuario.getId());
            case STUDENT -> aprendizado(resumo, usuario.getId());
        }

        return resumo;
    }

    /** Supremo cuida da plataforma inteira, nao de uma empresa. */
    private void plataforma(HomeSummaryDto resumo, UUID tenantId) {
        resumo.setHeadline("Plataforma Trainify");
        resumo.setSubtitle("Acompanhe as empresas atendidas e os pedidos em aberto.");
        resumo.getCards().add(card("Empresas ativas", tenantRepository.count(), "companies"));
        resumo.getCards().add(card("Convites pendentes", invitationRepository.countPendentes(), "invitations"));
        resumo.getCards().add(card("Cursos publicados", courseRepository.countByTenantIdAndStatus(tenantId, CourseStatus.PUBLISHED), "courses"));
    }

    /** Admin cuida da conta da empresa: gente e conteudo no ar. */
    private void empresa(HomeSummaryDto resumo, UUID tenantId) {
        resumo.setHeadline("Sua empresa");
        resumo.setSubtitle("Gerencie as pessoas, os convites e o conteúdo disponível.");
        resumo.getCards().add(card("Pessoas ativas", userRepository.countByTenantIdAndIsActiveTrue(tenantId), "users"));
        resumo.getCards().add(card("Convites pendentes", invitationRepository.countPendentesPorEmpresa(tenantId), "invitations"));
        resumo.getCards().add(card("Cursos publicados", courseRepository.countByTenantIdAndStatus(tenantId, CourseStatus.PUBLISHED), "courses"));
        resumo.getCards().add(card("Rascunhos", courseRepository.countByTenantIdAndStatus(tenantId, CourseStatus.DRAFT), "courses"));
    }

    /** Gestor acompanha como a equipe esta indo. */
    private void equipe(HomeSummaryDto resumo, UUID tenantId) {
        long emAndamento = enrollmentRepository.countByTenantIdAndStatus(tenantId, EnrollmentStatus.IN_PROGRESS);
        long concluidas = enrollmentRepository.countByTenantIdAndStatus(tenantId, EnrollmentStatus.COMPLETED);
        long total = emAndamento + concluidas;

        resumo.setHeadline("Sua equipe");
        resumo.setSubtitle("Veja quem está em dia e quem precisa de um empurrão.");
        resumo.getCards().add(card("Treinamentos em andamento", emAndamento, "dashboards"));
        resumo.getCards().add(card("Concluídos", concluidas, "dashboards"));
        resumo.getCards().add(card("Taxa de conclusão", total == 0 ? 0 : Math.round(concluidas * 100.0 / total), "dashboards", "%"));
        resumo.getCards().add(card("Pessoas ativas", userRepository.countByTenantIdAndIsActiveTrue(tenantId), "users"));
    }

    /** Instrutor olha para o que produziu e para quem esta fazendo. */
    private void producao(HomeSummaryDto resumo, UUID tenantId, UUID instrutorId) {
        long publicados = courseRepository.countByInstructorIdAndStatus(instrutorId, CourseStatus.PUBLISHED);
        long rascunhos = courseRepository.countByInstructorIdAndStatus(instrutorId, CourseStatus.DRAFT);

        resumo.setHeadline("Seus cursos");
        resumo.setSubtitle("Continue de onde parou e acompanhe quem está estudando.");
        resumo.getCards().add(card("Cursos publicados", publicados, "courses"));
        resumo.getCards().add(card("Rascunhos", rascunhos, "courses"));
        resumo.getCards().add(card("Alunos em andamento",
                enrollmentRepository.countByTenantIdAndStatus(tenantId, EnrollmentStatus.IN_PROGRESS), "courses"));
        resumo.getCards().add(card("Conclusões",
                enrollmentRepository.countByTenantIdAndStatus(tenantId, EnrollmentStatus.COMPLETED), "courses"));
    }

    /** Aluno quer saber o que falta estudar. */
    private void aprendizado(HomeSummaryDto resumo, UUID alunoId) {
        var matriculas = enrollmentRepository.findByUserId(alunoId);
        long emAndamento = matriculas.stream().filter(m -> m.getStatus() == EnrollmentStatus.IN_PROGRESS).count();
        long concluidos = matriculas.stream().filter(m -> m.getStatus() == EnrollmentStatus.COMPLETED).count();

        long aulasConcluidas = matriculas.stream()
                .mapToLong(m -> lessonProgressRepository.countByEnrollmentIdAndStatus(m.getId(), ProgressStatus.COMPLETED))
                .sum();

        resumo.setHeadline("Bons estudos");
        resumo.setSubtitle("Continue de onde parou e conquiste seus certificados.");
        resumo.getCards().add(card("Cursos em andamento", emAndamento, "courses"));
        resumo.getCards().add(card("Cursos concluídos", concluidos, "courses"));
        resumo.getCards().add(card("Aulas concluídas", aulasConcluidas, "courses"));
        resumo.getCards().add(card("Certificados", certificationRepository.findByUserId(alunoId).size(), "certifications"));
    }

    private Role papelDe(CustomUserDetails usuario) {
        String papel = usuario.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "");
        return Role.valueOf(papel);
    }

    private HomeSummaryDto.Card card(String label, long value, String link) {
        return card(label, value, link, null);
    }

    private HomeSummaryDto.Card card(String label, long value, String link, String suffix) {
        HomeSummaryDto.Card card = new HomeSummaryDto.Card();
        card.setLabel(label);
        card.setValue(value);
        card.setLink(link);
        card.setSuffix(suffix);
        return card;
    }

    private List<HomeSummaryDto.Card> vazio() {
        return new ArrayList<>();
    }
}
