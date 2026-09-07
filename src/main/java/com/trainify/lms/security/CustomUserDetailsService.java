package com.trainify.lms.security;

import com.trainify.lms.domain.entities.User;
import com.trainify.lms.repositories.UserRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final EntityManager entityManager;

    @Override
    @Transactional
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        // Bypass RLS para encontrar o usuário globalmente durante o login
        entityManager.createNativeQuery("SET LOCAL app.bypass_rls = 'on'").executeUpdate();
        
        User user = userRepository.findByEmailAndIsActiveTrue(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found or inactive with email: " + email));
        return new CustomUserDetails(user);
    }
}
