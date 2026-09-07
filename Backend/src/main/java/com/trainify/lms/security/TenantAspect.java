package com.trainify.lms.security;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Aspect
@Component
public class TenantAspect {

    @PersistenceContext
    private EntityManager entityManager;

    @Before("execution(* com.trainify.lms.repositories.*.*(..))")
    public void setTenantId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof CustomUserDetails) {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            UUID tenantId = userDetails.getTenantId();
            
            // Como os repositórios são executados dentro de transações (Spring Data implicitamente adiciona @Transactional),
            // este SET LOCAL será aplicado à transação atual.
            entityManager.createNativeQuery("SELECT set_config('app.current_tenant_id', :tenantId, true)")
                    .setParameter("tenantId", tenantId.toString())
                    .getSingleResult();
        }
    }
}
