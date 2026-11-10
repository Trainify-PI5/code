package com.trainify.lms.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuracao da IA, lida de {@code app.ai} no application.yml.
 *
 * <p>Cada recurso (chat, quiz, estrutura do curso, texto das aulas) tem o proprio
 * ajuste do modelo, os mesmos parametros vistos no notebook da disciplina:
 * qual modelo da Groq usar, a temperatura (0 = sempre a resposta mais provavel;
 * mais alto = mais variacao), o limite de tokens da resposta e o esforco de
 * raciocinio dos modelos que "pensam" antes de responder.
 */
@ConfigurationProperties(prefix = "app.ai")
public record IaProperties(
        String groqApiKey,
        Tarefa chat,
        Tarefa quiz,
        Tarefa cursoEstrutura,
        Tarefa cursoAula) {

    /**
     * @param modelo      nome do modelo na Groq (ex.: openai/gpt-oss-20b)
     * @param temperatura de 0 a 2
     * @param maxTokens   limite de tokens da resposta (max_completion_tokens)
     * @param raciocinio  reasoning_effort: low, medium ou high nos gpt-oss; vazio para nao enviar
     */
    public record Tarefa(String modelo, Double temperatura, Integer maxTokens, String raciocinio) {}

    private static final Tarefa PADRAO_CHAT = new Tarefa("openai/gpt-oss-20b", 0.3, 1500, "low");
    private static final Tarefa PADRAO_QUIZ = new Tarefa("openai/gpt-oss-120b", 0.2, 4000, "low");
    private static final Tarefa PADRAO_ESTRUTURA = new Tarefa("openai/gpt-oss-120b", 0.2, 3000, "low");
    private static final Tarefa PADRAO_AULA = new Tarefa("qwen/qwen3.8-27b", 0.4, 2000, "none");

    public IaProperties {
        chat = completar(chat, PADRAO_CHAT);
        quiz = completar(quiz, PADRAO_QUIZ);
        cursoEstrutura = completar(cursoEstrutura, PADRAO_ESTRUTURA);
        cursoAula = completar(cursoAula, PADRAO_AULA);
    }

    /** Sem a chave da Groq os recursos de IA ficam desligados (o resto do sistema funciona normalmente). */
    public boolean configurada() {
        return groqApiKey != null && !groqApiKey.isBlank();
    }

    private static Tarefa completar(Tarefa t, Tarefa padrao) {
        if (t == null) {
            return padrao;
        }
        return new Tarefa(
                t.modelo() == null || t.modelo().isBlank() ? padrao.modelo() : t.modelo(),
                t.temperatura() == null ? padrao.temperatura() : t.temperatura(),
                t.maxTokens() == null ? padrao.maxTokens() : t.maxTokens(),
                t.raciocinio() == null ? padrao.raciocinio() : t.raciocinio());
    }
}
