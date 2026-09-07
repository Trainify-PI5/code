package com.trainify.lms.security;

import com.trainify.lms.domain.entities.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;
import java.util.UUID;

@Getter
public class CustomUserDetails implements UserDetails {

    private final UUID id;
    private final UUID tenantId;
    private final String email;
    private final String password;
    private final Collection<? extends GrantedAuthority> authorities;
    private final boolean isActive;
    private final String name;
    private final String avatar;

    public CustomUserDetails(User user) {
        this.id = user.getId();
        this.tenantId = user.getTenant().getId();
        this.email = user.getEmail();
        this.password = user.getPasswordHash();
        this.authorities = Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
        this.isActive = user.getIsActive();
        this.name = user.getName();
        this.avatar = user.getAvatar();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return isActive;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return isActive;
    }
}
