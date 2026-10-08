package com.trainify.lms.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * A foto do usuario fica em um bucket privado, entao o endereco dela expira. Por
 * isso guardamos a chave do arquivo (prefixo {@code s3:}) e geramos um endereco
 * novo a cada leitura. Enderecos externos, que ja vem prontos, passam direto.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AvatarUrlResolver {

    public static final String S3_PREFIX = "s3:";

    private final S3Service s3Service;

    public String resolve(String storedValue) {
        if (storedValue == null || storedValue.isBlank()) {
            return storedValue;
        }
        if (!storedValue.startsWith(S3_PREFIX)) {
            return storedValue;
        }
        // O endereco e assinado toda vez, inclusive ao gerar o token de login. Se o
        // armazenamento estiver fora do ar, o usuario fica sem foto, nunca sem acesso.
        try {
            return s3Service.generatePresignedDownloadUrl(storedValue.substring(S3_PREFIX.length()));
        } catch (Exception e) {
            log.warn("Falha ao assinar o endereço da foto: {}", e.getMessage());
            return null;
        }
    }

    /** Valor a ser gravado no banco a partir da chave do arquivo enviado. */
    public static String storedValueForKey(String key) {
        return S3_PREFIX + key;
    }
}
