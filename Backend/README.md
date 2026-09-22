# Trainify — Backend

API do Trainify, plataforma de treinamento corporativo (LMS). Spring Boot 3.4 com
Java 21, banco PostgreSQL no Supabase, Redis para controle de sessão e Storage do
Supabase (compatível com S3) para vídeos e documentos.

## Pré-requisitos

- **JDK 21** (o projeto não compila com o 17)
- Acesso ao banco e às chaves, que ficam no `.env` de cada um

```bash
java -version   # deve mostrar 21
```

Não é preciso instalar o Maven: use o `./mvnw` que acompanha o projeto.

## Rodando na sua máquina

Crie um arquivo `.env` (ele é ignorado pelo Git) ou exporte as variáveis abaixo.
Peça os valores a quem tem acesso ao Supabase.

| Variável | Para que serve |
|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://<host-do-session-pooler>:5432/postgres?sslmode=require` |
| `SPRING_DATASOURCE_USERNAME` | usuário do banco (`postgres.<referência-do-projeto>`) |
| `SPRING_DATASOURCE_PASSWORD` | senha do banco |
| `SPRING_DATA_REDIS_URL` | `rediss://default:<senha>@<host>.upstash.io:6379` |
| `JWT_SECRET` | chave de assinatura dos tokens, com 32 caracteres ou mais |
| `CORS_ALLOWED_ORIGINS` | endereços do front autorizados, separados por vírgula |
| `AWS_S3_ENDPOINT` | `https://<referência>.storage.supabase.co/storage/v1/s3` |
| `AWS_S3_REGION`, `AWS_S3_BUCKET` | região do projeto e `trainify-media` |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | chaves do Storage |

```bash
./mvnw spring-boot:run
```

A API sobe em `http://localhost:8080/api/v1`. Para conferir se está no ar:

```bash
curl http://localhost:8080/api/v1/health
```

⚠️ O banco é **compartilhado com o ambiente de produção**. Rodar local mexe nos
mesmos dados que a apresentação usa.

## Testes

```bash
./mvnw test
```

São 87 testes. O `TrainifyBackendApplicationTests.contextLoads` precisa de banco e
falha fora de um ambiente configurado; os demais rodam sem dependência externa.

Para rodar só o que não precisa de banco, como faz o GitHub:

```bash
./mvnw test -Dtest='!TrainifyBackendApplicationTests'
```

## Deploy

Hospedado no [Render](https://render.com), a partir do `Dockerfile` desta pasta,
com o perfil `prod`.

**O fluxo é automático:** ao enviar para a `main`, o GitHub roda os testes do
backend e do frontend e, se tudo passar, aciona o deploy. Código que quebra os
testes não chega em produção.

- API: <https://trainify-api-p2ka.onrender.com/api/v1>
- Site: <https://code-coral-five.vercel.app>

O plano gratuito hiberna o serviço após 15 minutos sem uso, e acordar leva alguns
minutos. O workflow `keep-api-awake.yml` faz um ping a cada 10 minutos para evitar
isso.

## Pontos de atenção do projeto

- **Separação por empresa (multi-tenant):** as tabelas têm políticas de RLS no
  banco, mas elas **não filtram** o usuário que a aplicação utiliza. Na prática, o
  isolamento é feito no código, serviço por serviço. Ao escrever uma consulta nova,
  filtre pela empresa do usuário logado (`CustomUserDetails.getTenantId()`).
- **Redis:** além do cache, guarda os tokens invalidados. Toda requisição
  autenticada consulta o Redis, então, se ele cair, o sistema para depois do login.
- **Migrações:** ficam em `src/main/resources/db/changelog` e rodam pelo Liquibase
  quando a aplicação sobe. Adicione um arquivo novo e registre no
  `db.changelog-master.yaml`; nunca edite uma migração que já rodou.
- **Cache:** a lista de cursos publicados é guardada em JSON no Redis por 10
  minutos. Alterações em cursos limpam esse cache automaticamente.
