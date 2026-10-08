package com.trainify.lms.security;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.trainify.lms.domain.entities.User;
import com.trainify.lms.repositories.UserRepository;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final EntityManager entityManager;

    static final String SEPARADOR = "#";

    /**
     * O mesmo e-mail pode ter conta em mais de uma empresa. Para nao ficar ambiguo,
     * quem chama informa a empresa no formato {@code email#idDaEmpresa}, que e o
     * que o token e a tela de login usam.
     */
    public static String usernameFor(String email, java.util.UUID tenantId) {
        return tenantId == null ? email : email + SEPARADOR + tenantId;
    }

    @Override
    @Transactional
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // Bypass RLS para encontrar o usuário globalmente durante o login
        entityManager.createNativeQuery("SET LOCAL app.bypass_rls = 'on'").executeUpdate();

        String valor = username.trim();
        int separador = valor.indexOf(SEPARADOR);

        if (separador > 0) {
            String email = valor.substring(0, separador);
            java.util.UUID tenantId;
            try {
                tenantId = java.util.UUID.fromString(valor.substring(separador + 1));
            } catch (IllegalArgumentException e) {
                throw new UsernameNotFoundException("Empresa inválida para " + email);
            }

            User user = userRepository.findByEmailIgnoreCaseAndTenantIdAndIsActiveTrue(email, tenantId)
                    .orElseThrow(() -> new UsernameNotFoundException("Conta não encontrada nesta empresa: " + email));
            return new CustomUserDetails(user);
        }

        java.util.List<User> contas = userRepository.findAllByEmailIgnoreCaseAndIsActiveTrue(valor);
        if (contas.isEmpty()) {
            throw new UsernameNotFoundException("User not found or inactive with email: " + valor);
        }
        if (contas.size() > 1) {
            throw new UsernameNotFoundException("Este e-mail tem conta em mais de uma empresa; informe qual.");
        }
        return new CustomUserDetails(contas.get(0));
    }
}
