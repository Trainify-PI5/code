package com.trainify.lms.ai;

import java.io.IOException;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;

/**
 * Tratamento de texto da IA, sem LLM: extrair o texto de PDFs, dividir em
 * trechos e escolher palavras-chave para a busca.
 */
public final class TextoIa {

    private TextoIa() {
    }

    /** Trechos de ~1200 caracteres cabem varios num pedido e ainda tem contexto suficiente. */
    static final int TAMANHO_TRECHO = 1200;
    static final int SOBREPOSICAO = 150;
    static final int MAX_PAGINAS_PDF = 500;

    // ── PDF ──

    /** Texto de cada pagina do PDF (a posicao na lista e a pagina - 1). */
    public static List<String> paginasDoPdf(byte[] pdf) {
        try (PDDocument documento = Loader.loadPDF(pdf)) {
            PDFTextStripper extrator = new PDFTextStripper();
            int total = Math.min(documento.getNumberOfPages(), MAX_PAGINAS_PDF);
            List<String> paginas = new ArrayList<>(total);
            for (int pagina = 1; pagina <= total; pagina++) {
                extrator.setStartPage(pagina);
                extrator.setEndPage(pagina);
                paginas.add(limpar(extrator.getText(documento)));
            }
            return paginas;
        } catch (IOException e) {
            throw new IllegalArgumentException("Não foi possível ler o PDF (arquivo corrompido ou protegido por senha).");
        }
    }

    /** Junta espacos repetidos e linhas em branco em excesso. */
    static String limpar(String texto) {
        if (texto == null) {
            return "";
        }
        return texto.replace("\r", "")
                .replaceAll("[ \\t\\x0B\\f]+", " ")
                .replaceAll(" *\n *", "\n")
                .replaceAll("\n{3,}", "\n\n")
                .strip();
    }

    // ── trechos ──

    public static List<String> dividir(String texto) {
        return dividir(texto, TAMANHO_TRECHO, SOBREPOSICAO);
    }

    /**
     * Divide o texto em trechos de ate {@code tamanho} caracteres. O corte procura
     * um fim de paragrafo, de linha ou de frase para nao partir uma ideia no meio,
     * e cada trecho repete o fim do anterior ({@code sobreposicao}) para nao perder
     * o contexto na emenda.
     */
    static List<String> dividir(String texto, int tamanho, int sobreposicao) {
        String limpo = limpar(texto);
        List<String> trechos = new ArrayList<>();
        if (limpo.isEmpty()) {
            return trechos;
        }
        int inicio = 0;
        while (inicio < limpo.length()) {
            int fim = Math.min(inicio + tamanho, limpo.length());
            if (fim < limpo.length()) {
                fim = melhorCorte(limpo, inicio, fim);
            }
            String trecho = limpo.substring(inicio, fim).strip();
            if (!trecho.isEmpty()) {
                trechos.add(trecho);
            }
            if (fim >= limpo.length()) {
                break;
            }
            int proximo = fim - sobreposicao;
            if (proximo <= inicio) {
                proximo = fim;
            } else {
                // Comeca a sobreposicao no inicio de uma palavra
                int espaco = limpo.indexOf(' ', proximo);
                proximo = espaco > 0 && espaco < fim ? espaco + 1 : proximo;
            }
            inicio = proximo;
        }
        return trechos;
    }

    private static int melhorCorte(String texto, int inicio, int fim) {
        int minimo = inicio + (fim - inicio) / 2;
        for (String separador : List.of("\n\n", "\n", ". ", "; ", " ")) {
            int posicao = texto.lastIndexOf(separador, fim - separador.length());
            if (posicao >= minimo) {
                return posicao + separador.length();
            }
        }
        return fim;
    }

    // ── palavras-chave ──

    /** Palavras que nao ajudam a encontrar o assunto de uma pergunta. */
    private static final Set<String> VAZIAS = Set.of(
            "que", "qual", "quais", "como", "onde", "quando", "quem", "porque", "por", "para", "pra",
            "com", "sem", "sobre", "entre", "uma", "uns", "umas", "dos", "das", "nos", "nas", "aos",
            "pelo", "pela", "pelos", "pelas", "este", "esta", "esse", "essa", "isso", "isto", "aquele",
            "aquela", "ele", "ela", "eles", "elas", "voce", "voces", "meu", "minha", "seu", "sua", "mais",
            "menos", "muito", "muita", "ser", "sao", "foi", "tem", "ter", "existe", "fazer", "faz",
            "pode", "posso", "devo", "deve", "preciso", "explique", "explica", "fale", "diga", "sabe",
            "aula", "curso", "cursos", "aulas", "material", "nao", "sim", "ola", "oi", "bom", "dia",
            "tudo", "bem", "obrigado", "obrigada", "valeu", "tchau", "boa", "tarde", "noite",
            // pedidos sobre a aula aberta, que nao dizem o assunto
            "resuma", "resumo", "resumir", "resume", "principais", "principal", "pontos", "ponto",
            "importante", "importantes", "melhor", "detalhe", "detalhes", "entendi", "entender");

    /**
     * Palavras significativas do texto, em minusculas e sem repetir. Os acentos
     * ficam (a busca do PostgreSQL compara com acento).
     */
    static List<String> palavrasChave(String texto, int maximo) {
        Set<String> palavras = new LinkedHashSet<>();
        if (texto == null) {
            return List.of();
        }
        for (String palavra : texto.toLowerCase(Locale.ROOT).split("[^\\p{L}\\p{N}]+")) {
            if (palavra.length() >= 3 && !VAZIAS.contains(semAcento(palavra))) {
                palavras.add(palavra);
                if (palavras.size() == maximo) {
                    break;
                }
            }
        }
        return new ArrayList<>(palavras);
    }

    /**
     * Consulta para o {@code to_tsquery} do PostgreSQL: as palavras-chave ligadas
     * por OU. Trechos com mais palavras da pergunta ficam mais bem colocados.
     * Cada palavra so tem letras e numeros, entao a consulta nunca quebra a sintaxe.
     *
     * @return null se a pergunta nao tem nenhuma palavra util
     */
    public static String consultaTextual(String texto) {
        List<String> palavras = palavrasChave(texto, 20);
        return palavras.isEmpty() ? null : String.join(" | ", palavras);
    }

    /**
     * Pontuacao simples de relevancia, usada fora do banco (quiz com tema e curso a
     * partir de documentos): quantas palavras-chave aparecem no texto.
     */
    static int pontuar(String texto, List<String> palavras) {
        if (texto == null || palavras.isEmpty()) {
            return 0;
        }
        String normalizado = semAcento(texto.toLowerCase(Locale.ROOT));
        int pontos = 0;
        for (String palavra : palavras) {
            String radical = semAcento(palavra);
            // Compara pelo comeco da palavra: "treinamento" acha "treinamentos"
            radical = radical.length() > 5 ? radical.substring(0, radical.length() - 2) : radical;
            if (normalizado.contains(radical)) {
                pontos++;
            }
        }
        return pontos;
    }

    static String semAcento(String texto) {
        return Normalizer.normalize(texto, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
    }

    static int contarPalavras(String texto) {
        String limpo = texto == null ? "" : texto.strip();
        return limpo.isEmpty() ? 0 : limpo.split("\\s+").length;
    }

    static String cortar(String texto, int maximo) {
        if (texto == null) {
            return "";
        }
        return texto.length() <= maximo ? texto : texto.substring(0, maximo).strip() + "…";
    }
}
