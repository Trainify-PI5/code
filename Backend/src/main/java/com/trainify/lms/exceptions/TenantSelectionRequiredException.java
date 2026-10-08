package com.trainify.lms.exceptions;

import java.util.List;
import java.util.UUID;

/**
 * O e-mail tem conta em mais de uma empresa, entao o login precisa saber em qual
 * entrar. A lista vai junto para a tela montar a escolha.
 */
public class TenantSelectionRequiredException extends RuntimeException {

    private final transient List<TenantOption> tenants;

    public TenantSelectionRequiredException(List<TenantOption> tenants) {
        super("Este e-mail tem acesso a mais de uma empresa. Escolha em qual deseja entrar.");
        this.tenants = tenants;
    }

    public List<TenantOption> getTenants() {
        return tenants;
    }

    public record TenantOption(UUID id, String name) {}
}
