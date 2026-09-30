# Inventário técnico — Central de Compras para Railway

Data da análise: 30/09/2026  
Escopo: leitura estática de `apps/central-compras` na branch `lab/central-compras-copy`.

## Limites e conclusão executiva

Nenhuma credencial, banco, bucket, função, ambiente Lovable, Railway, DNS ou migration foi acessado ou alterado. Este documento descreve apenas o código disponível na cópia. As migrations e `src/integrations/supabase/types.ts` são uma boa referência de contrato, mas não substituem uma exportação do schema real antes da migração.

A Central ainda depende diretamente do Supabase em cinco frentes: Auth, PostgREST/queries, Storage, Realtime e Edge Functions. Há também acoplamento à infraestrutura de e-mail do Lovable e ao conector Twilio do Lovable. A substituição por Railway é viável, mas deve ser tratada como reconstrução gradual do backend, não como simples troca de hospedagem.

## 1. Dependências Supabase e Lovable

### Cliente e variáveis

- `src/integrations/supabase/client.ts`: instancia `@supabase/supabase-js`, recebe `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`, mantém sessão persistente.
- `src/integrations/supabase/previewAuthStorage.ts`: comportamento exclusivo de preview Lovable; compartilha sessão com o editor por `postMessage`, usando `localStorage` fora do preview. Deve desaparecer na migração.
- `.env.example`: contém apenas placeholders de homologação. Na arquitetura final o frontend passa a usar, no máximo, `VITE_API_BASE_URL`; credenciais nunca devem ir ao navegador.

### Arquivos do frontend que chamam Supabase

| Área | Arquivos | Dependência principal | Substituição Railway |
| --- | --- | --- | --- |
| Sessão e rotas | `pages/Auth.tsx`, `Index.tsx`, `ResetPassword.tsx`, `Admin.tsx`, `ApprovalAnalysis.tsx`, `RequisitionApprovals.tsx`, `Stock.tsx`, `AdminUsers.tsx`, `ExternalIdentities.tsx` | login, sessão, roles e logout | `apiClient` HTTP + cookie de sessão HttpOnly; guardas no backend |
| Solicitações | `components/NewRequestDialog.tsx`, `DirectPurchaseDialog.tsx`, `PurchasesCRM.tsx`, `RequestDetailsDialog.tsx`, `AnalysisDialog.tsx`, `PurchasesReport.tsx` | CRUD de solicitações, status, quotes, aprovações e anexos | endpoints orientados ao domínio, nunca acesso SQL direto pelo browser |
| Aprovação e mensagens | `components/ApproverQuestions*.tsx`, `SolicitationMessages.tsx`, `KeyApproverRejectionsAlert.tsx`, `AdminRejectionsHistory.tsx`, `RejectionsHistory.tsx` | perguntas, mensagens, histórico e permissões | endpoints de consulta/ação + SSE ou polling autenticado |
| Arquivos | `NewRequestDialog.tsx`, `QuotesUpload.tsx`, `RequestDetailsDialog.tsx`, `AnalysisDialog.tsx`, `Admin.tsx`, `Stock.tsx`, `PurchasesReport.tsx` | upload/download/delete no Storage | Railway Bucket via API e URLs pré-assinadas curtas |
| Integração planejada | `services/externalIdentityMappings.ts`, `pages/ExternalIdentities.tsx` | tabela/RPC ainda pendentes | manter como módulo administrativo futuro, sem SSO nesta fase |
| Funções | `components/ReportDialog.tsx`, `QuotesUpload.tsx`, `ApproverQuestions.tsx`, `AnalysisDialog.tsx`, `RequestDetailsDialog.tsx`, `NewRequestDialog.tsx`, `RequisitionApprovals.tsx`, `Stock.tsx`, `pages/AdminUsers.tsx`, `Unsubscribe.tsx` | `supabase.functions.invoke` | endpoints API ou worker interno |

O componente `RealtimeNotifications.tsx` e as telas de admin, aprovação e requisição também usam canais `postgres_changes` do Supabase. Isto é uma sexta dependência técnica: Realtime.

## 2. Banco: tabelas, operações e endpoints futuros

O tipo gerado aponta 16 tabelas ativas. `external_identity_mappings` aparece no frontend, porém a migration correspondente está em `docs/pending-migrations` e declarada como não aplicada.

| Tabela/entidade | Operações observadas | Atores atuais | Endpoint sugerido |
| --- | --- | --- | --- |
| `auth.users` (Supabase) | login, cadastro, senha, listagem/administração | usuário e super_admin | `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/logout`, `POST /api/auth/password/*`, `GET /api/users` |
| `profiles` | SELECT, criação por trigger, atualização própria | usuário; admin; estoque/requisition_approver para leitura | `GET/PATCH /api/me`, `GET /api/users/:id/profile` |
| `user_roles` | SELECT; INSERT/UPDATE/DELETE administrativo | todos leem seu papel; admin/super_admin gerem | `GET /api/me`, `GET/PUT /api/users/:id/roles` |
| `solicitations` | SELECT, INSERT, UPDATE, DELETE | dono, admin/super_admin, aprovadores, estoque e veto conforme estado/tipo | `GET/POST /api/solicitations`, `GET/PATCH/DELETE /api/solicitations/:id` |
| `attachments` | SELECT, INSERT, DELETE | dono; admin; estoque em itens faltantes | `GET/POST /api/solicitations/:id/attachments`, `DELETE /api/attachments/:id` |
| `quotes` | SELECT, INSERT, UPDATE, DELETE | solicitante/admin; aprovador consulta | `GET/POST /api/solicitations/:id/quotes`, `PATCH/DELETE /api/quotes/:id` |
| `approvals` | SELECT, INSERT; DELETE em exclusão de solicitação | aprovador, requisition_approver, admin/super_admin | `GET /api/solicitations/:id/approvals`, `POST /api/solicitations/:id/approvals` |
| `approvers` | SELECT; associação atual por e-mail | admin e aprovadores | `GET /api/approvers`, `PUT /api/approvers` administrativo futuro |
| `approver_questions` | SELECT, INSERT, UPDATE (resposta) | aprovador e fluxo administrativo | `GET/POST /api/solicitations/:id/questions`, `PATCH /api/questions/:id` |
| `status_history` | SELECT, INSERT; DELETE em exclusão em cascata manual | dono em sua solicitação; aprovadores/admin | `GET /api/solicitations/:id/history`; gerar registros apenas no serviço de domínio |
| `solicitation_messages` | SELECT, INSERT e Realtime | participantes autorizados, admin, aprovadores | `GET/POST /api/solicitations/:id/messages`; `GET /api/events` (SSE) opcional |
| `receipts` | está no schema/tipos; nenhuma query direta encontrada no frontend | super_admin cria; dono/admin lê pela política histórica | `GET/POST /api/solicitations/:id/receipts` quando a tela for reativada |
| `stock_activity_log` | SELECT, INSERT | stock, requisition_approver, admin/super_admin | `GET /api/solicitations/:id/stock-activity`, gravado pelo fluxo de estoque |
| `email_send_log` | INSERT/SELECT interno | worker/serviço | sem endpoint público; observabilidade administrativa restrita |
| `email_send_state` | SELECT/UPDATE interno | worker/serviço | sem endpoint público; configuração do worker |
| `email_unsubscribe_tokens` | SELECT, UPSERT, UPDATE | serviço de e-mail/endpoint público de descadastro | `GET/POST /api/email/unsubscribe` |
| `suppressed_emails` | SELECT, UPSERT | worker de e-mail/webhook | sem endpoint público; gestão administrativa controlada |
| `external_identity_mappings` (pendente) | SELECT, INSERT, UPDATE de status; RPC `list_identity_users` | admin | deixar fora do corte inicial; sem SSO |

Além das tabelas, o e-mail depende de RPCs/filas PostgreSQL: `enqueue_email`, `read_email_batch`, `delete_email` e `move_to_dlq`. No Railway elas devem ser substituídas por uma tabela de jobs com lock/transação ou por um worker com fila dedicada; não por chamadas do navegador.

## 3. Auth atual e fluxo próprio futuro

### Fluxo atual

1. `Auth.tsx` permite cadastro público por `supabase.auth.signUp` com nome e telefone em metadata.
2. Um trigger histórico cria/atualiza `profiles` e papel padrão em `user_roles`.
3. Login usa `signInWithPassword`; o frontend consulta `user_roles` para decidir a rota administrativa.
4. Sessão é lida por `getSession`/`getUser`, observada por `onAuthStateChange` e encerrada por `signOut`.
5. `ResetPassword.tsx` exige sessão e chama `updateUser`; o botão de “esqueci minha senha” na tela atual não possui fluxo implementado.
6. Administração de usuários é uma Edge Function; apenas `super_admin` pode listar, apagar e trocar senhas. A função atual tem senha padrão de contingência, que não deve ser reproduzida.

### Fluxo Railway recomendado

- Criar `users` com `id uuid` **sem default de substituição durante a importação**: cada `users.id` recebe o UUID legado de `auth.users.id`.
- Guardar `email_normalized`, `password_hash` (Argon2id), `status`, `must_reset_password`, `created_at`, `last_login_at`; migrar `profiles` como extensão ou mesclar seus campos em `users`.
- Usar sessões opacas rotativas em tabela `sessions`, enviadas em cookie `HttpOnly`, `Secure`, `SameSite=Lax`; invalidar ao trocar senha/desativar usuário. Isso evita expor tokens ao JavaScript.
- Implementar recuperação por token único, hash do token no banco, expiração curta e envio assíncrono. Não enviar senha temporária pela API.
- Incluir `roles` e `user_roles` com chave única `(user_id, role)`. O backend calcula permissões; o frontend usa apenas `GET /api/me` para exibir a interface.
- Não integrar o login do MKR Hub nesta fase. A Central terá autenticação própria, apenas preservando os UUIDs para uma futura associação segura.

## 4. Storage e anexos

Há um bucket privado: `solicitation-attachments`.

| Uso | Metadado salvo | Operação atual |
| --- | --- | --- |
| anexo inicial da solicitação | `attachments.file_path`, nome, MIME, tamanho, tipo, solicitacão e uploader | upload e registro em `attachments` |
| cotações | `quotes.file_path`, nome e uploader | upload, download e exclusão |
| comprovantes/notas | campos de anexo/nota em `solicitations`; `receipts.invoice_file_path` quando usado | upload e download |
| itens faltantes de estoque | `attachments` com path vinculado à solicitação | upload/download por estoque |

O bucket é privado; o código baixa objetos autenticados e remove arquivos de cotações. O backend novo deve manter a mesma postura:

1. Railway Bucket privado, S3-compatible, como armazenamento recomendado; ele suporta upload, download, delete e URLs pré-assinadas. Cada ambiente possui credenciais e bucket isolados. [Railway Buckets](https://docs.railway.com/storage-buckets)
2. `storage_objects` ou os próprios registros existentes mantêm `bucket`, `object_key`, nome original, MIME, tamanho, checksum, uploader e data.
3. `POST /api/uploads/presign` valida usuário, solicitação, extensão, MIME e tamanho e devolve URL de upload curta; `POST /api/uploads/complete` confirma objeto e grava metadados transacionalmente.
4. `GET /api/files/:id` revalida permissão e devolve URL de download curta ou faz streaming pelo backend. Buckets Railway são privados e devem ser servidos por URL assinada ou proxy autorizado. [Guia Railway de uploads](https://docs.railway.com/guides/storage-buckets-guide)
5. Não usar Volume como repositório de anexos: ele é acoplado a um serviço. Usar Volume somente para estado local que pertença a um único processo; anexos corporativos precisam de object storage.

Nenhum arquivo foi baixado ou migrado nesta etapa.

## 5. Edge Functions e substituição

| Função atual | Chamador/gatilho | Função | Variáveis atuais | Destino Railway |
| --- | --- | --- | --- | --- |
| `admin-user-management` | `AdminUsers.tsx` | lista, exclui e redefine senha de usuários | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` | rotas administrativas `GET /api/users`, `DELETE /api/users/:id`, `POST /api/users/:id/password-reset` |
| `generate-report` | `ReportDialog.tsx` | consulta solicitações e gera CSV | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | `GET /api/reports/solicitations.csv`; autenticação e filtros no servidor |
| `send-transactional-email` | solicitações, cotações, aprovações, estoque e diálogos | autoriza template, cria token de descadastro, registra e enfileira e-mail | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` | serviço `EmailService` + tabela `email_jobs` + endpoint interno |
| `process-email-queue` | agendamento/service-role | processa filas, retry, rate limit, TTL e DLQ; envia pela API Lovable | `LOVABLE_API_KEY`, `LOVABLE_SEND_URL`, variáveis Supabase | serviço Worker/Railway Cron, provider de e-mail direto, `email_jobs` e `email_attempts` |
| `handle-email-unsubscribe` | página `Unsubscribe.tsx` e links de e-mail | valida token, marca usado e suprime endereço | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | `GET/POST /api/email/unsubscribe` |
| `handle-email-suppression` | webhook de e-mail Lovable | valida assinatura e registra bounce/complaint/descadastro | `LOVABLE_API_KEY`, variáveis Supabase | `POST /api/webhooks/email/suppression` com segredo próprio do provider |
| `preview-transactional-email` | fluxo interno Lovable | renderiza preview de templates | `LOVABLE_API_KEY` | ferramenta/admin restrita ou remover do primeiro corte |
| `notify-whatsapp` | criação/liberação de solicitação | envia WhatsApp via gateway Lovable/Twilio | `LOVABLE_API_KEY`, `TWILIO_API_KEY` | `WhatsAppService` no worker usando credenciais Twilio diretas; tirar destinatários do código |
| `seed-test-users` | manual, não chamado pelo frontend | cria usuários de teste e atribui papéis | variáveis Supabase | script de seed exclusivo de homologação, nunca endpoint HTTP |

Os templates React Email em `supabase/functions/_shared/transactional-email-templates` são ativos como conteúdo; podem ser preservados e movidos para `apps/central-compras-api/src/email/templates`.

## 6. RLS atual convertida em guardas

As políticas foram alteradas muitas vezes ao longo das migrations. A política final deve ser extraída do schema real antes do corte. A intenção encontrada no código/migrations é:

| Regra de negócio | Guarda recomendada |
| --- | --- |
| usuário vê/edita seus próprios pedidos e anexos | `requireAuth` + `canReadSolicitation(user, solicitation)` / `canEditOwnSolicitation` |
| admin e super_admin veem e administram tudo | `requireAnyRole('admin','super_admin')` |
| somente super_admin administra usuários e ações destrutivas de contas | `requireRole('super_admin')` |
| aprovador vê pedidos pendentes, registra aprovação e pergunta | `requireApproverForSolicitation`; validar vínculo por ID, não só e-mail |
| veto de cotação/status | `requireVetoApprover`; migrar a lista para relação explícita de permissões, não IDs fixos em SQL |
| requisition_approver atua apenas em `internal_requisition` | `requireRole('requisition_approver')` + `requireRequestType('internal_requisition')` |
| estoque vê e movimenta apenas requisições internas liberadas | `requireRole('stock')` + validação de estado permitida |
| mensagens, histórico e download | validar acesso à solicitação pai antes de ler/gravar/assinar objeto |
| relatórios, gestão de roles e identidade externa | guardas administrativas no backend, com auditoria |

Criar serviços de domínio para transições de estado (`approve`, `reject`, `veto`, `release`, `start-separation`, `pickup`, `return`) em vez de expor `PATCH` livre para todos os campos. Cada transição grava `status_history` e/ou `stock_activity_log` dentro da mesma transação.

## 7. Desenho recomendado

```text
apps/central-compras/       React + Vite; somente UI e apiClient
apps/central-compras-api/   Node 22 + Fastify + Prisma + PostgreSQL Railway
apps/central-compras-worker/ jobs de e-mail/WhatsApp/relatórios agendados
packages/central-domain/    contratos, validação Zod, permissões e tipos compartilhados
```

Recomendação: Fastify + Prisma. Fastify mantém a API separada do Vite, oferece validação/plug-ins e baixo peso; Prisma facilita preservar UUIDs e migrar o schema para PostgreSQL Railway. Express também é aceitável, mas exige mais convenções manuais. Nest acrescentaria estrutura, porém é excesso para uma primeira extração. Next API não é recomendado agora porque voltaria a misturar a Central Vite com o Hub Next.

Stack: Node 22, Fastify, Prisma, PostgreSQL Railway, Argon2id, cookies de sessão opacos, Zod, Pino, rate limit por IP/e-mail, Railway Bucket via AWS SDK S3-compatible, React Email + provedor de e-mail direto, SDK Twilio direto e Worker separado.

## 8. Modelo inicial Railway

```text
users(id UUID legado PK, email, password_hash, status, must_reset_password, created_at, updated_at)
user_profiles(user_id PK/FK, full_name, phone, ...)
roles(code PK)
user_roles(user_id, role, PK(user_id, role))
sessions(id, user_id, token_hash, expires_at, revoked_at)
password_reset_tokens(id, user_id, token_hash, expires_at, used_at)

solicitations(id UUID PK, user_id FK, request_type, status, approval_status, stock_status, ...campos atuais)
attachments(id UUID PK, solicitation_id FK, object_key, file_name, mime_type, size, uploaded_by)
quotes(id UUID PK, solicitation_id FK, object_key, ...)
approvals(id UUID PK, solicitation_id FK, approver_id, status, ...)
approvers(id UUID PK, user_id FK opcional/obrigatório após saneamento, name, email)
approver_questions(id UUID PK, solicitation_id FK, approver_id, answered_by, ...)
solicitation_messages(id UUID PK, solicitation_id FK, sender_id, channel, message)
status_history(id UUID PK, solicitation_id FK, changed_by, old_status, new_status, justification)
stock_activity_log(id UUID PK, solicitation_id FK, performed_by, action, details)
receipts(id UUID PK, solicitation_id FK, object_key, ...)

email_jobs(id UUID PK, idempotency_key UNIQUE, payload JSONB, status, attempts, available_at)
email_attempts(id UUID PK, job_id FK, status, error_message, created_at)
email_suppressions(email UNIQUE, reason, metadata)
email_unsubscribe_tokens(token_hash UNIQUE, email, expires_at, used_at)
audit_log(id UUID PK, actor_id, action, target_type, target_id, metadata, created_at)
```

`id` de `users`, `profiles.user_id`, `solicitations.user_id`, `attachments.uploaded_by`, `status_history.changed_by` e demais referências devem manter os UUIDs já existentes. Não copiar sessões ou tokens Supabase.

## 9. Fases de migração

1. **Inventário e contrato de APIs:** congelar esta matriz, exportar schema/dados de produção apenas quando autorizado e definir testes de equivalência.
2. **Backend Railway vazio:** criar API, health check, logs, validação, CORS e ambiente de homologação sem dados de produção.
3. **Schema Prisma:** traduzir schema real para Prisma/PostgreSQL, incluindo UUIDs, índices, constraints e auditoria; testar em banco vazio.
4. **Auth próprio:** importar usuários preservando IDs, mas forçar redefinição de senha ou fluxo seguro de primeiro acesso; não importar hashes/sessões sem estratégia validada.
5. **Queries para endpoints:** substituir tela a tela, começando por leitura de solicitações e perfil, depois criação/edição, aprovação e estoque.
6. **Storage:** criar Bucket de homologação, implementar URLs assinadas e testar paths/metadados; somente depois planejar cópia verificável dos objetos.
7. **E-mail, WhatsApp e workers:** substituir Lovable por provider direto, fila, retry, DLQ, webhook assinado e segredos no Railway.
8. **Homologação:** testes de permissão por papel, regressão de fluxos, carga, anexos, notificações, restore e comparação de contagens/checksums.
9. **Corte de domínio:** janela de freeze, backup/restauração validada, troca controlada de domínio e plano de rollback. Nenhuma etapa anterior autoriza corte.

## 10. Riscos prioritários

1. As migrations são históricas e incluem políticas/alterações pontuais; não devem ser executadas em sequência como fonte definitiva.
2. O frontend acessa banco e Storage diretamente. Uma migração segura exige mover todas as decisões de autorização para a API antes de retirar Supabase.
3. Há permissões por e-mail, papéis e regras especiais de veto; elas precisam virar relações explícitas no novo banco para evitar escalonamento indevido.
4. Algumas funções possuem destinatários de WhatsApp e decisões de negócio fixos no código. Eles devem virar configuração auditável e não devem ser copiados para ambientes de teste sem consentimento.
5. O e-mail combina fila PostgreSQL, logs, supressão, tokens de descadastro, TTL e retries; trocar apenas o “enviar e-mail” perderia controles essenciais.
6. Dados de solicitante, CPF, assinaturas e anexos exigem acesso mínimo, logs e retenção definida. URLs pré-assinadas devem expirar rapidamente.
7. A preservação de UUID mantém integridade histórica, mas senhas e sessões exigem estratégia separada. Não assumir que hashes/Auth Supabase são portáveis.
8. Realtime precisa de solução explícita: SSE autenticado para notificações/mensagens ou polling curto como primeira entrega. Não deixá-lo implícito.

## 11. O que não fazer agora

- Não aplicar migrations antigas, a migration de `external_identity_mappings` ou qualquer SQL contra produção.
- Não apontar `.env` ou Railway para o Supabase/Lovable original.
- Não copiar anexos, usuários, senhas, sessões, tokens ou dados de produção sem plano de exportação/restauração autorizado.
- Não ligar a Central ao login do MKR Hub e não implementar SSO nesta etapa.
- Não expor Railway Bucket publicamente; usar autorização de backend e URLs assinadas.
- Não levar chaves de serviço, chaves Lovable, chaves Twilio ou listas de destinatários para o frontend ou Git.
- Não trocar DNS, publicar serviço ou desativar a Central original até a homologação ser aprovada.
