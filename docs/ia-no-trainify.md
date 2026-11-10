# Inteligência Artificial no Trainify

Este documento explica como a IA foi implementada no Trainify: o que ela faz, como
as peças se encaixam, onde fica cada coisa no código e por que as escolhas foram
feitas assim. Ele também liga cada parte ao que vimos no notebook da disciplina
(`GROQ_PRATICA.ipynb`).

---

## 1. O que a IA faz no sistema

| Recurso | Quem usa | Onde aparece na tela |
|---|---|---|
| **Assistente de estudos (chat)** | todos os perfis | página "Assistente IA" e o widget de chat dentro da aula |
| **IA por tipo de conta** | aluno, instrutor, gestor/admin | o mesmo chat responde de jeito diferente para cada perfil |
| **Quiz gerado por IA** | instrutor e administradores | botão "Gerar com IA" na aula de avaliação do módulo |
| **Criar curso a partir de documentos** | instrutor e administradores | página "Criar curso com IA": envia PDFs/textos, revisa e aprova |

A IA **sempre responde com base no material dos cursos** (texto das aulas e PDFs
anexados). Ela não inventa conteúdo de fora e não salva nada sozinha: o quiz e o
curso gerados são sugestões que o instrutor revisa antes de publicar.

---

## 2. Arquitetura

```
 Navegador (React, Vercel)
        │  JWT do usuário
        ▼
 Backend Spring Boot (Render) ─────────────► Groq (LLM)
   ├─ módulo de IA: com.trainify.lms.ai         API compatível com a da OpenAI,
   │    ├─ Llm            (único ponto que       chamada pelo Spring AI
   │    │                  fala com a Groq)
   │    ├─ RagService     (chat)
   │    ├─ GeradorDeQuiz  (quiz)
   │    ├─ GeradorDeCurso (curso a partir de documentos)
   │    └─ LessonIndexingService (prepara o texto das aulas)
   │
   └─ PostgreSQL (Supabase)
        ├─ tabelas do sistema (cursos, aulas, matrículas...)
        ├─ ai_lesson_chunks  (trechos das aulas + índice de busca em português)
        ├─ ai_lesson_index   (quais aulas já foram preparadas)
        └─ course_generation_drafts (andamento e proposta do curso gerado)
```

**Decisões principais:**

- **Um backend só.** A IA é um módulo (pacote `ai`) dentro do backend Spring Boot que
  já existia. Não há serviço separado para hospedar, manter acordado ou proteger
  com chave interna. O navegador nunca fala com a Groq: tudo passa pelo backend,
  que sabe quem é o usuário.
- **Spring AI** (a biblioteca oficial do ecossistema Spring para LLMs, a mesma dos
  tutoriais da Baeldung) para conversar com a **Groq**. A Groq aceita o mesmo
  formato de pedido da API da OpenAI, então usamos o módulo `openai` do Spring AI
  apontando para o endereço da Groq.
- **Sem embeddings e sem banco vetorial.** A Groq não gera embeddings, e o notebook
  da disciplina não usa. Para achar o trecho certo das aulas usamos a **busca
  textual do próprio PostgreSQL em português** (seção 6). É mais simples, não precisa
  de outro serviço e funciona bem para o tamanho dos cursos.
- **A LLM só é chamada para gerar texto.** Buscar trechos, decidir o que cada perfil
  pode ver, montar o "mapa" de um documento e validar respostas é código Java comum.

---

## 3. Ligação com o notebook da disciplina

| No notebook | No Trainify | Onde no código |
|---|---|---|
| `client = Groq(api_key=...)` | o Spring AI cria o cliente com `GROQ_API_KEY` e o endereço da Groq | `application.yml` (`spring.ai.openai`) |
| `client.chat.completions.create(model=..., messages=[...])` | `chatClient.prompt(new Prompt(mensagens, opcoes)).call()` | `Llm.gerar` |
| `temperature` | uma por recurso: chat 0,3; quiz e estrutura do curso 0,2; texto das aulas 0,4 | `app.ai.*.temperatura` |
| `max_completion_tokens` | limite da resposta de cada recurso | `app.ai.*.max-tokens` → `maxCompletionTokens` |
| `reasoning_effort="none"` | `low` nos modelos gpt-oss (não aceitam `none`); `none` no Qwen que escreve as aulas | `app.ai.*.raciocinio` → `reasoningEffort` |
| *System prompt* ("Você é um professor...") | um prompt para cada tipo de conta | `PromptsIa.sistemaDoChat` |
| Chat simples com a lista `messages` | o histórico da conversa vai como mensagens `user`/`assistant` | `RagService.paraMensagens` |
| LLM para obter informação | o assistente responde lendo os trechos das aulas | `RagService.chat` |
| LLM para estruturação de dados (JSON) | quiz e estrutura do curso saem em JSON, com o "modo JSON" da API ligado | `Llm.gerarJson`, `GeradorDeQuiz`, `GeradorDeCurso` |

**O que fizemos além do notebook:**
- **Validação do JSON:** o notebook só imprime o resultado. Aqui o código confere o
  JSON (quantidade de perguntas, uma única alternativa correta etc.) e, se estiver
  errado, pede de novo dizendo o que corrigir.
- **Contexto do material:** antes de perguntar, o sistema busca os trechos das
  aulas que têm a ver com a pergunta e manda junto. É o padrão chamado **RAG**
  (*Retrieval-Augmented Generation*: recuperar e depois gerar).

---

## 4. Configuração

Variável de ambiente obrigatória (no Render e no `.env` local):

| Variável | O que é |
|---|---|
| `GROQ_API_KEY` | chave da Groq (console.groq.com/keys). Sem ela o sistema sobe normalmente e só os recursos de IA ficam desligados (a tela esconde os botões) |

Opcionais, para trocar modelos sem mexer no código: `IA_CHAT_MODELO`,
`IA_QUIZ_MODELO`, `IA_CURSO_MODELO`, `IA_AULA_MODELO`, `GROQ_BASE_URL`.

Trecho do `Backend/src/main/resources/application.yml`:

```yaml
spring:
  ai:
    openai:
      base-url: https://api.groq.com/openai   # a Groq fala o formato da OpenAI
      api-key: ${GROQ_API_KEY:sem-chave}
    model:                                     # a Groq só tem chat
      embedding: none
      image: none
      moderation: none
      audio: { speech: none, transcription: none }

app:
  ai:
    groq-api-key: ${GROQ_API_KEY:}
    chat:            { modelo: openai/gpt-oss-20b,  temperatura: 0.3, max-tokens: 1500, raciocinio: low }
    quiz:            { modelo: openai/gpt-oss-120b, temperatura: 0.2, max-tokens: 4000, raciocinio: low }
    curso-estrutura: { modelo: openai/gpt-oss-120b, temperatura: 0.2, max-tokens: 3000, raciocinio: low }
    curso-aula:      { modelo: qwen/qwen3.8-27b,    temperatura: 0.4, max-tokens: 2000, raciocinio: none }
```

Por que modelos diferentes:
- **gpt-oss-20b** no chat: rápido (respostas em menos de 1 segundo nos testes).
- **gpt-oss-120b** no quiz e na estrutura do curso: maior, segue melhor as regras
  e o formato JSON.
- **Qwen** para escrever as aulas do curso gerado: a Groq limita os tokens por
  minuto **por modelo**. Com um modelo só para isso, gerar um curso não tira a cota
  do chat.

Dependência no `pom.xml`: `spring-ai-starter-model-openai`, versão `1.1.8` pelo
`spring-ai-bom` (a linha 1.1 é a compatível com Spring Boot 3.4 e 3.5).

---

## 5. As classes do módulo de IA (`Backend/src/main/java/com/trainify/lms/ai`)

| Classe | Responsabilidade |
|---|---|
| `Llm` | Único ponto que chama a LLM. Monta as mensagens (sistema, histórico, usuário), aplica as opções do modelo e traduz os erros da Groq em mensagens para a tela |
| `IaProperties` / `IaConfig` | Lê a configuração `app.ai` (modelo, temperatura, tokens, raciocínio de cada recurso) |
| `PromptsIa` | Todos os prompts de sistema: chat por perfil, quiz, estrutura do curso e texto da aula |
| `AiCourseScope` | Decide **quais cursos** a pessoa pode consultar, conforme o perfil (seção 7.1) |
| `RagService` | O chat: escopo, busca de trechos, montagem do pedido e resposta com as fontes. Também orquestra o quiz |
| `GeradorDeQuiz` | Pede o quiz em JSON, valida e repete com as correções |
| `CourseGenerationService` | "Criar curso com IA": recebe os arquivos, extrai o texto, acompanha, revisa e aprova |
| `GeradorDeCurso` | A geração em si, em segundo plano: mapa, estrutura e aulas |
| `LessonIndexingService` | Prepara o texto de cada aula (texto escrito, transcrição e PDF) e divide em trechos |
| `TrechoRepository` | Grava e busca os trechos no PostgreSQL (SQL com busca textual em português) |
| `TextoIa` | Utilitários sem LLM: extrair texto de PDF (PDFBox), dividir em trechos, palavras-chave |
| `AiIndexListener` | Ao salvar ou excluir aula/curso, atualiza os trechos (depois do commit, em segundo plano) |
| `AiIndexSync` | De 5 em 5 minutos, prepara as aulas que ainda não têm trechos (ex.: as que já existiam) |
| `AiController`, `CourseDraftController`, `controllers/IaProxyController` | Endpoints REST usados pelo front |

Endpoints (todos exigem login):

| Método e caminho | Uso |
|---|---|
| `GET /api/v1/ai/status` | `{"enabled": true/false}`: a tela esconde a IA se não houver chave |
| `POST /api/v1/ia/chat` | pergunta do chat: `{query, history, lessonId?, courseId?}` → `{response, sources}` |
| `POST /api/v1/ai/lessons/{id}/quiz?questions=5&topic=...` | sugestão de quiz para a aula de avaliação (instrutor/admin) |
| `POST /api/v1/ai/course-drafts` (multipart) | envia documentos e começa a gerar um curso |
| `GET /api/v1/ai/course-drafts/{id}` | andamento (`progress`, `step`) e a proposta quando pronta |
| `PUT /api/v1/ai/course-drafts/{id}/proposal` | salva as edições do instrutor |
| `POST /api/v1/ai/course-drafts/{id}/approve` | cria o curso (em rascunho) a partir da proposta |
| `DELETE /api/v1/ai/course-drafts/{id}` | descarta (se ainda estiver gerando, a geração para) |

---

## 6. Preparação do texto das aulas

A LLM tem limite de tamanho por pedido, então não dá para mandar o curso inteiro a
cada pergunta. O sistema guarda o texto das aulas **dividido em trechos** e, a cada
pergunta, manda só os trechos relevantes.

**Quando acontece:**
1. O instrutor cria ou edita uma aula → `CourseService` publica o evento
   `LessonChanged` → depois do commit, o `AiIndexListener` chama
   `LessonIndexingService.indexar` em segundo plano. Salvar a aula nunca espera nem
   falha por causa da IA.
2. Aulas que existiam antes desta versão são preparadas pelo `AiIndexSync`, em lotes
   de 20 a cada 5 minutos.

**O que é feito com a aula:**
1. Junta o **texto escrito** pelo instrutor, a **transcrição** do vídeo (se houver) e o
   **texto do PDF** anexado (baixado do Storage e lido com o PDFBox).
2. Divide em trechos de até **1.200 caracteres**, cortando de preferência no fim de
   parágrafo ou de frase, com **150 caracteres de sobreposição** (o começo de um
   trecho repete o fim do anterior, para não perder o contexto na emenda).
3. Grava em `ai_lesson_chunks`, com o título da aula no começo de cada trecho.

**A busca em português.** A tabela tem uma coluna calculada pelo próprio PostgreSQL:

```sql
search TSVECTOR GENERATED ALWAYS AS (to_tsvector('portuguese', content)) STORED
-- com índice GIN para a busca ser rápida
```

O dicionário `portuguese` descarta palavras vazias ("de", "o", "que") e reduz as
palavras ao radical: "treinamentos", "treinamento" e "treinar" viram a mesma
coisa. A pergunta passa pelo mesmo tratamento:

```sql
SELECT ... , ts_rank_cd(t.search, q) AS nota
FROM ai_lesson_chunks t JOIN lessons l ... JOIN modules m ... JOIN courses c ...
CROSS JOIN to_tsquery('portuguese', 'altura | treinamento | periódico') q
WHERE c.id IN (:cursosPermitidos) AND t.search @@ q
ORDER BY nota DESC LIMIT 6
```

- As palavras-chave da pergunta são ligadas por "OU" (`|`): trechos com mais
  palavras da pergunta ganham nota maior (`ts_rank_cd`).
- Trechos com nota abaixo de **40% da melhor** são descartados: só tinham uma palavra
  em comum e virariam fontes erradas.
- O `WHERE c.id IN (...)` é o que garante que a busca **só olha os cursos permitidos**.
- A consulta junta com aulas, módulos e cursos: aula excluída sai da busca na hora
  (e os trechos dela são apagados junto, por `ON DELETE CASCADE`).

Migração: `Backend/src/main/resources/db/changelog/17-ia-trechos-das-aulas.sql`
(roda sozinha pelo Liquibase quando o backend sobe).

---

## 7. O assistente (chat)

Arquivo principal: `RagService.chat`. O pedido passa por três etapas:

### 7.1 Quem pergunta e o que pode ver (`AiCourseScope`)

| Perfil | Cursos que o assistente pode consultar |
|---|---|
| Aluno | os cursos em que está matriculado |
| Instrutor | os cursos que ministra e os cursos em que está matriculado |
| Gestor e administradores | todos os cursos **da empresa** |

Com uma aula aberta, a busca fica restrita ao curso daquela aula. Pedir uma aula de
curso que a pessoa não pode ver dá "Aula não encontrada" (404), sem revelar que ela
existe. Esse é o **isolamento entre empresas e entre alunos**: a busca do passo 7.2
só recebe os cursos desta lista.

### 7.2 Recuperar os trechos

- **Sem aula aberta:** busca nos cursos permitidos.
- **Com aula aberta:** busca primeiro na aula. Se nada combinar, busca no curso (o
  assunto pode estar em outra aula). Se nada combinar em lugar nenhum (ex.:
  "resuma esta aula"), usa o começo da própria aula.
- **Pergunta de seguimento** ("e o prazo?"): tem poucas palavras de assunto, então
  a busca usa também a pergunta anterior. A LLM entende o resto pelo histórico.
- **Nenhum trecho combinou:** a LLM recebe só a **lista de cursos e aulas** da pessoa
  (para responder "quais cursos eu tenho?") e a instrução de dizer que o material
  não cobre o assunto.
- **Orçamento:** no máximo ~7.000 caracteres de material e ~4.000 de histórico por
  pedido (seção 10).

### 7.3 Gerar a resposta

A lista de mensagens enviada à Groq tem o mesmo formato do notebook:

```
[system]    regras gerais + o papel do perfil (tutor, apoio ao instrutor ou gestor)
[user]      pergunta anterior          ┐
[assistant] resposta anterior          ┘ histórico (até 10 mensagens)
[user]      MATERIAL DO CURSO:
            [Curso: Segurança no Trabalho | Aula: Trabalho em altura]
            Considera-se trabalho em altura toda atividade acima de 2,00 m...
            PERGUNTA: A partir de quantos metros é trabalho em altura?
```

**O que muda por perfil** (`PromptsIa.PAPEIS`):
- **Aluno:** tutor. Explica com exemplos, é breve e **não entrega gabarito** de avaliação.
- **Instrutor:** além de responder, ajuda no trabalho pedagógico (sugere perguntas,
  resumos, objetivos de aprendizagem).
- **Gestor/administrador:** foco em aplicação, obrigações e riscos; respostas em
  tópicos, prontas para decisão.

**Regras para todos:** responder só com base no material, dizer com franqueza quando
o material não cobre o assunto, citar a aula de onde veio a informação e tratar o
material como dado (não como instrução, contra *prompt injection*).

A resposta volta com as **fontes**: as aulas de onde vieram os trechos usados.

---

## 8. Quiz gerado por IA

No Trainify o quiz é uma aula própria (tipo `QUIZ`) no fim do módulo. O botão
"Gerar com IA" pede ao `RagService.suggestQuiz`:

1. Confere se o instrutor tem acesso ao curso.
2. Pega os trechos de **todas as aulas do módulo**. Se o instrutor informou um tema,
   os trechos que mais falam dele vêm primeiro; senão, trechos espalhados pelo
   módulo inteiro (até ~9.000 caracteres).
3. `GeradorDeQuiz` pede o quiz em **JSON**, com o modo JSON da API ligado:
   ```json
   {"title": "...", "questions": [{"text": "...", "explanation": "...",
     "options": [{"text": "...", "isCorrect": true}, ...]}]}
   ```
4. **Valida:** número certo de perguntas e de alternativas, exatamente 1 correta,
   nada repetido, sem "todas/nenhuma das anteriores", sem verdadeiro/falso.
5. Se houver problema, **pede de novo listando os erros** (até 3 tentativas).
6. Embaralha as alternativas (LLMs tendem a pôr a correta sempre na mesma posição)
   e devolve no formato do `CreateAssessmentRequest`. **Nada é salvo:** o instrutor
   revisa e salva na tela.

---

## 9. Criar curso a partir de documentos

Tela "Criar curso com IA": o instrutor envia até 5 arquivos (PDF, `.txt` ou `.md`,
até 15 MB no total), escolhe a faixa de módulos e pode escrever orientações.

**No envio** (`CourseGenerationService.iniciar`):
1. Confere tamanhos **antes de ler os arquivos** (a instância gratuita tem pouca memória).
2. Extrai o texto: PDFs **página por página** (para citar as páginas depois).
   PDF escaneado (só imagem) não tem texto e é recusado com explicação.
3. Grava o rascunho como `PROCESSING` e entrega a geração ao `GeradorDeCurso`, que
   roda **em segundo plano**. A tela consulta o andamento a cada poucos segundos.

**A geração** (`GeradorDeCurso`), em três etapas:

1. **Mapa do material (sem LLM):** amostras espalhadas por cada documento, do começo
   ao fim, com a página. Assim a LLM vê o material inteiro sem receber o texto todo.
2. **Estrutura (1 chamada, JSON):** título, descrição, módulos (com objetivo) e aulas
   (com 3 a 5 tópicos e de quais documentos devem sair). O código valida: título,
   quantidade de módulos dentro da faixa, aulas com título. Se estiver errado, pede
   de novo com os problemas.
3. **Aulas (1 chamada por aula):** para cada aula, os pedaços dos documentos que mais
   falam do título e dos tópicos vão para a LLM, que escreve o texto em markdown.
   O **tamanho da aula acompanha o material** (entre 150 e 600 palavras): com pouco
   material, a LLM tende a "encher" com conteúdo que não está nos documentos.
   Cada aula guarda as **fontes** (documento e páginas, ex.: `nr-35.pdf (p. 2-5)`).

**Cuidados:**
- **Uma geração por vez:** o limite de tokens por minuto é da conta inteira.
- **Limite da Groq atingido:** a geração **espera e continua** (mostra "Aguardando o
  limite de uso da IA") em vez de falhar.
- **Descartar no meio:** o gerador confere o status antes de cada passo e para.
- **Servidor reiniciou no meio:** o rascunho é marcado como falha, com a explicação.

**Revisão e aprovação:** o instrutor edita títulos e textos, remove aulas ou módulos
e aprova. Só então o curso é criado **em rascunho**, pelo mesmo `CourseService` do
cadastro manual, com uma aula de avaliação vazia no fim de cada módulo (para o
"Gerar com IA" do quiz). As aulas criadas passam pela preparação da seção 6 e o
chat já responde sobre elas.

---

## 10. Limites da Groq (conta gratuita) e como o sistema lida

Os limites valem **por organização e por modelo**. Para gpt-oss-20b, gpt-oss-120b e
qwen3.8-27b: 30 pedidos/min, 1.000 pedidos/dia, **8 mil tokens/min** e 200 mil
tokens/dia.

| Limite | Consequência | O que o sistema faz |
|---|---|---|
| 8 mil tokens por minuto | um pedido inteiro (sistema + histórico + material + resposta) precisa caber nisso | orçamento de caracteres por pedido (~1 token a cada 3,5 caracteres em português) |
| tokens por minuto, somando pedidos | muitas perguntas seguidas ou uma geração de curso esgotam a cota do minuto | chat: mensagem "Muitas perguntas em pouco tempo. Aguarde alguns segundos"; geração de curso: espera e continua; recursos usam modelos diferentes |
| 200 mil tokens por dia | um curso gerado gasta dezenas de milhares de tokens | nos testes, usar documentos pequenos |
| modelos que "pensam" (gpt-oss) | o raciocínio gasta parte do `max_completion_tokens` | `reasoning_effort: low` e resposta vazia tratada como erro com nova tentativa |

Como o sistema não está em produção, o consumo é só dos testes e da apresentação.

---

## 11. Erros e mensagens

| Situação | O que a pessoa vê |
|---|---|
| sem `GROQ_API_KEY` | a tela esconde os botões de IA (`/ai/status` devolve `enabled: false`) |
| limite da Groq (429) | "Muitas perguntas em pouco tempo. Aguarde alguns segundos e tente de novo." |
| pergunta + material grandes demais (413) | "A pergunta e o material ficaram grandes demais para a IA..." |
| Groq fora do ar ou demorando | "A IA não respondeu agora. Tente novamente em instantes." |
| módulo sem texto para o quiz | "As aulas deste módulo ainda não têm texto para a IA usar..." |
| PDF escaneado no "Criar curso" | "Não encontrei texto em ... PDFs escaneados (só imagem) não funcionam..." |

O chat tem um **disjuntor** (*circuit breaker*, Resilience4j): se a IA falhar várias
vezes seguidas, as próximas perguntas recebem logo a mensagem de indisponível, em
vez de cada uma esperar o tempo limite.

---

## 12. Testes

**Automáticos** (`./mvnw test`, rodam no GitHub a cada push): nenhum teste chama a
Groq. Eles usam uma **LLM falsa** (`LlmFalsa`, que implementa a interface `ChatModel`
do Spring AI) com respostas programadas, e conferem o que foi enviado a ela.

| Arquivo de teste | O que verifica |
|---|---|
| `LlmTest` | ordem das mensagens (sistema, histórico, pergunta), opções do modelo, modo JSON, sem chave não chama, tradução dos erros da Groq |
| `RagServiceTest` | prompt por perfil, isolamento por cursos, aula aberta, seguimento, catálogo quando nada combina, fontes, orçamento, quiz |
| `GeradorDeQuizTest` | validação (2 corretas, repetidas, "todas as anteriores", verdadeiro/falso) e nova tentativa com a lista de erros |
| `GeradorDeCursoTest` | proposta completa com fontes e páginas, estrutura refeita, espera no limite da Groq, descarte no meio, falha registrada |
| `CourseGenerationServiceTest` | leitura de PDF/texto, limites de tamanho, PDF escaneado, uma geração por vez, rascunho órfão, aprovação |
| `LessonIndexingServiceTest` | texto + transcrição + PDF viram trechos; aula só de vídeo; falha numa aula não para as outras |
| `TextoIaTest` | divisão em trechos, palavras-chave da busca, extração de PDF |
| `TrainifyBackendApplicationTests` | o sistema sobe sem a chave da Groq e a IA fica desligada |

**De ponta a ponta (manual):** o backend foi rodado com um PostgreSQL 16 local
(igual ao do Supabase), a migração nova e a Groq de verdade, chamando a API como o
front faz. Resultados:

| Cenário | Resultado |
|---|---|
| aluno pergunta sobre aula do curso dele | resposta correta com a fonte, ~0,5 a 2 s |
| aluno pergunta sobre curso em que **não** está matriculado | não encontra; a resposta do outro curso nunca aparece |
| aluno tenta abrir aula de outro curso | 404 "Aula não encontrada" |
| pergunta de seguimento ("e o periódico?") | entendeu pelo histórico |
| "resuma esta aula" com a aula aberta | resumo só da aula aberta |
| mesma pergunta como instrutor e como gestor | instrutor: resposta técnica; gestor: tabela de obrigações |
| quiz de 3 perguntas | JSON válido, 4 alternativas, 1 correta, ~1 a 4 s |
| aluno tenta gerar quiz | 403 |
| curso a partir do PDF da NR-35 | 3 módulos e 9 aulas com páginas de origem em ~2 min, esperando o limite da Groq sozinho |
| aprovar o curso gerado | curso criado, as 12 aulas preparadas e o chat respondendo sobre ele |

---

## 13. Limitações conhecidas

- **A busca é por palavras, não por significado.** Sinônimos que não aparecem no
  texto ("capacete" × "proteção para a cabeça") podem não ser encontrados. Para o
  tamanho dos cursos isso funciona bem. Uma evolução seria somar embeddings
  (exige um provedor de embeddings, que a Groq não tem).
- **Gabarito:** a regra de não entregar gabarito ao aluno vale no prompt, mas o
  modelo nem sempre obedece quando a pergunta vem com as alternativas. A informação
  está na própria aula de qualquer forma.
- **PDF escaneado** (só imagem) não tem texto para a IA ler.
- **A geração de curso roda na memória do servidor:** se o servidor reiniciar no
  meio, é preciso enviar os documentos de novo (o rascunho mostra o aviso).
- **Uma geração de curso por vez** na plataforma inteira.

---

## 14. Perguntas que podem surgir na apresentação

**Vocês treinaram um modelo?** Não. Usamos LLMs prontos da Groq (gpt-oss e Qwen).
O trabalho está em **como** usamos: escolher o material certo, os prompts por perfil,
a validação das respostas e os limites.

**Onde exatamente a LLM é chamada?** Só na classe `Llm`. Todo o resto (permissões,
busca, divisão de texto, validação) é código comum.

**Como o aluno de uma empresa não vê o curso de outra?** O `AiCourseScope` monta a
lista de cursos permitidos a partir do usuário logado (matrículas, cursos que
ministra ou cursos da empresa), e a busca SQL só olha esses cursos. A LLM nunca
recebe material de fora dessa lista.

**Por que não usaram embeddings / banco vetorial?** A Groq não gera embeddings, e a
busca textual do PostgreSQL em português resolve bem o tamanho dos nossos cursos,
sem outro serviço para manter. A troca é que ela não entende sinônimos (seção 13).

**O que é temperatura?** Controla a variação da resposta: perto de 0, o modelo
escolhe sempre a continuação mais provável (bom para quiz e JSON); mais alto, ele
varia mais (usamos um pouco mais alto para escrever as aulas).

**O que acontece se a IA inventar algo?** As regras do prompt mandam usar só o
material e admitir quando não sabe; as respostas mostram as fontes; e o quiz e o
curso gerados passam pela revisão do instrutor antes de publicar.

**E se a Groq sair do ar?** O sistema continua funcionando; só a IA mostra a mensagem
de indisponível. Trocar de provedor é mudar a configuração do Spring AI.
