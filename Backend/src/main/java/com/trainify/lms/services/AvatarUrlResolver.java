package com.trainify.lms.services;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * A foto do usuario fica em um bucket privado, entao o endereco dela expira. Por
 * isso guardamos a chave do arquivo (prefixo {@code s3:}) e geramos um endereco
 * novo a cada leitura. Enderecos externos, que ja vem prontos, passam direto.
 */
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
        return s3Service.generatePresignedDownloadUrl(storedValue.substring(S3_PREFIX.length()));
    }

    /** Valor a ser gravado no banco a partir da chave do arquivo enviado. */
    public static String storedValueForKey(String key) {
        return S3_PREFIX + key;
    }
}
