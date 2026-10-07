# Empresas e convites

O cadastro público em `/api/v1/auth/register` foi desativado. Nenhuma empresa é escolhida automaticamente para novos usuários.

## Fluxo comercial

1. A solicitação chega ao painel **Comercial**.
2. Após a contratação, o SUPER_ADMIN abre **Cadastrar empresa após contratação** ou **Empresas**.
3. Confirma o nome da empresa, o nome e o e-mail do administrador.
4. **Criar empresa e enviar convite** cria a empresa e envia o convite com perfil ADMIN.
5. O administrador abre o link, define a senha e entra pelo login.
6. Na área **Convites**, convida colaboradores para sua própria empresa.

O formulário comercial não cria contas, cobra valores nem configura domínios. O estado da solicitação comercial continua sendo atualizado manualmente.

## Convites

- Validade de 48 horas e uso único.
- Empresa, e-mail e perfil vêm do registro do convite, nunca da página pública.
- O banco guarda apenas o hash do token. O link utiliza um fragmento de URL para evitar enviar o token em requisições de navegação.
- Reenviar substitui o token anterior; revogar impede a ativação e libera o e-mail para outro convite.
- Convites expirados podem ser reenviados ou revogados.
- Nenhum convite concede SUPER_ADMIN.
- O SUPER_ADMIN gerencia convites de qualquer empresa pela área Empresas. ADMIN gerencia apenas sua própria empresa.
- Falhas no envio de e-mail fazem a transação de criação/reenvio voltar ao estado anterior. Uma resposta de sucesso indica aceitação pelo serviço SMTP, não confirmação de entrega na caixa postal.
- Repetir o mesmo envio com o mesmo identificador não cria outra empresa ou outro convite.
- O cadastro manual existente em Usuários continua restrito aos perfis autorizados e à empresa da sessão.

## Publicação e conferência

Publicar backend e frontend. A migração Liquibase 14 cria a tabela de convites. Configurar `FRONTEND_URL` com a URL pública e o serviço SMTP pelas variáveis `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_SMTP_AUTH` e `MAIL_SMTP_STARTTLS`.

Em um ambiente de teste com e-mail autorizado:
1. Criar uma empresa e conferir o recebimento do convite.
2. Aceitar em janela anônima, entrar e conferir empresa e perfil ADMIN.
3. Reabrir o link e confirmar que não permite outra ativação.
4. Convidar um colaborador e conferir o vínculo com a empresa.
5. Reenviar um convite e conferir que o link anterior falha.
6. Revogar um convite e conferir que o link deixa de funcionar.
7. Confirmar que outro administrador não consegue listar, reenviar ou revogar convites dessa empresa.
8. Confirmar que o SUPER_ADMIN mantém a identidade Trainify.

Os testes automatizados não enviam e-mails reais.
