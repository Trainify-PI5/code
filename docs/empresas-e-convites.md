# Empresas e convites

O cadastro público em `/api/v1/auth/register` foi desativado. Nenhuma empresa é escolhida automaticamente para novos usuários.

## Fluxo comercial

1. A solicitação chega ao painel **Comercial**.
2. Após a contratação, o SUPER_ADMIN abre **Cadastrar empresa após contratação** ou **Empresas**.
3. Confirma o nome da empresa, o nome e o e-mail do administrador.
4. **Criar empresa e gerar convite** cria a empresa e mostra um link com perfil ADMIN. O supremo usa **Copiar convite** e entrega o link ao responsável.
5. O administrador abre o link, define a senha e entra pelo login. Não é enviado e-mail automaticamente.
6. Na área **Convites**, convida colaboradores para sua própria empresa.

O formulário comercial não cria contas, cobra valores nem configura domínios. O estado da solicitação comercial continua sendo atualizado manualmente.

## Convites

- Validade de 48 horas e uso único.
- Empresa, e-mail e perfil vêm do registro do convite, nunca da página pública.
- O banco guarda apenas o hash do token. O link utiliza um fragmento de URL para evitar enviar o token em requisições de navegação.
- **Gerar novo link** substitui o token anterior; revogar impede a ativação e libera o e-mail para outro convite.
- Convites expirados podem receber um novo link ou ser revogados.
- O link é exibido apenas após sua geração e permanece em memória enquanto a tela estiver aberta. Não é salvo no armazenamento do navegador nem devolvido na listagem de convites.
- A geração e a cópia usam o endereço do próprio site e não dependem de domínio próprio, SMTP ou `FRONTEND_URL`.
- Nenhum convite concede SUPER_ADMIN.
- O SUPER_ADMIN gerencia convites de qualquer empresa pela área Empresas. ADMIN gerencia apenas sua própria empresa.
- Repetir a mesma solicitação com o mesmo identificador não cria outra empresa ou outro convite. O token não é recuperável; se a resposta original se perder, gere outro link pela lista.
- O cadastro manual existente em Usuários continua restrito aos perfis autorizados e à empresa da sessão.

## Publicação e conferência

Publicar backend e frontend. A migração Liquibase 14 cria a tabela de convites; a geração manual não exige outra migração nem configuração de e-mail.

A API mantém o envio por e-mail para uso futuro: omitir `delivery` ou usar `delivery=EMAIL` preserva o comportamento anterior. A interface utiliza `delivery=LINK`. Somente o modo EMAIL exige `FRONTEND_URL` e o SMTP configurado pelas variáveis `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_SMTP_AUTH` e `MAIL_SMTP_STARTTLS`. Falhas de envio nesse modo desfazem a transação.

Em um ambiente de teste:
1. Criar uma empresa e copiar o convite exibido na tela.
2. Aceitar em janela anônima, entrar e conferir empresa e perfil ADMIN.
3. Reabrir o link e confirmar que não permite outra ativação.
4. Convidar um colaborador e conferir o vínculo com a empresa.
5. Gerar novo link de um convite e conferir que o anterior falha.
6. Revogar um convite e conferir que o link deixa de funcionar.
7. Confirmar que outro administrador não consegue listar, reenviar ou revogar convites dessa empresa.
8. Confirmar que o SUPER_ADMIN mantém a identidade Trainify.

Os testes automatizados não enviam e-mails reais.
