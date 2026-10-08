package com.trainify.lms.dto;

import java.util.ArrayList;
import java.util.List;

import lombok.Data;

/** Conteudo da tela inicial, montado conforme o perfil de quem entrou. */
@Data
public class HomeSummaryDto {

    private String role;
    private String userName;
    private String headline;
    private String subtitle;
    private List<Card> cards = new ArrayList<>();

    @Data
    public static class Card {
        private String label;
        private long value;
        /** Tela para onde o cartao leva. */
        private String link;
        /** Sufixo do numero, como "%". */
        private String suffix;
    }
}
