# Solicitações comerciais

A página pública `/contratar` recebe pedidos de demonstração e proposta. O envio não cria uma empresa, usuário, assinatura ou cobrança.

O frontend envia os dados para `POST /api/v1/public/sales-requests`. O backend valida contato, tamanho dos campos e autorização de contato, grava em `sales_leads` e retorna um protocolo. O mesmo identificador de envio pode ser repetido após uma falha de rede sem duplicar a solicitação. Há um campo de detecção de preenchimento automatizado e um limite de dez envios por minuto por endereço remoto, por instância do backend. Em ambientes com proxy, configure o encaminhamento de endereços apenas a partir de proxies confiáveis; o limite local não substitui a proteção de borda em múltiplas instâncias.

Usuários `SUPER_ADMIN` consultam os pedidos em **Comercial** (`/sales-requests`) e podem marcar o atendimento como **Nova**, **Em contato** ou **Encerrada**. Administradores das empresas clientes não têm acesso. A tabela é global da equipe Trainify e não pertence a uma empresa cliente.

Para disponibilizar o fluxo, publique o backend com a migração Liquibase `12-sales-leads.sql` antes do frontend. Não há novas variáveis obrigatórias. O frontend usa a configuração existente `VITE_API_URL`. É necessário que a equipe possua um usuário com o perfil `SUPER_ADMIN`.

Os pedidos são consultados dentro do sistema. Esta implementação não envia e-mails, não agenda reuniões automaticamente e não integra meios de pagamento. A autorização registrada usa a versão `sales-contact-v1`, correspondente ao texto apresentado no formulário.
