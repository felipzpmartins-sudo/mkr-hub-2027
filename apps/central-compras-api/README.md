# Central de Compras API — laboratório

Este é o esqueleto do backend próprio da Central de Compras. Ele é isolado do MKR Hub e do frontend Vite em `../central-compras` e não substitui a Central em produção.

## Limites desta etapa

- Há somente um endpoint: `GET /health`.
- Não há rotas de autenticação, acesso a banco, Storage, SSO, migration ou integração externa implementados.
- O cliente Prisma é preguiçoso: o servidor não abre conexão com PostgreSQL até que uma rota futura chame `getPrisma()`.
- Nunca informe neste diretório URL, senha, token ou chave de ambientes Lovable, Supabase ou produção.
- Nenhuma migration existe ou foi executada. `prisma/schema.prisma` é somente um contrato de rascunho e não autoriza a criação de banco.

## UUIDs legados

Na migração, `users.id` deverá receber exatamente o UUID existente em `auth.users.id` do Supabase. Ele não possui valor padrão para evitar regeneração acidental. Os UUIDs de relacionamentos históricos também serão preservados.

`profiles.id` não é uma identidade de autenticação. Autenticação e relações de negócio usam `users.id`; o perfil é apenas compatibilidade de dados. Sessões e tokens temporários não serão migrados, e senhas antigas não serão reutilizadas: usuários poderão exigir redefinição de senha antes do primeiro login próprio.

## Contrato inicial de dados

O schema Prisma contém somente a base para evoluir de forma controlada:

- autenticação: `User`, `AuthSession` e `PasswordResetToken`;
- compatibilidade e autorização futura: `Profile` e `UserRole`;
- fluxo principal: `Solicitation`, `Attachment`, `StatusHistory` e `Approver`.

Sessões e redefinições preveem apenas hashes de tokens — o token puro nunca deve ser armazenado. `Approver` permanece identificado por e-mail; um `userId` opcional só poderá ser proposto numa etapa posterior de saneamento de dados aprovada.

Os campos específicos do legado, valores permitidos de status e tipo de solicitação, estoque, aprovações, mensagens, cotações e recibos continuam pendentes. Eles serão definidos a partir do inventário e de um plano de importação validado, sem copiar dados ou regras de produção.

## Guardas de autorização futuras

Nenhuma rota autenticada foi criada. Quando houver autorização aprovada, cada ação deverá usar a guarda apropriada:

- `requireAuth` — usuário identificado;
- `requireAdmin` — administração;
- `requireApprover` — decisões de aprovação;
- `requireStock` — operações de estoque;
- `requireOwnerOrAdmin` — recurso do solicitante ou administração.

Essas guardas não implementam SSO e não integram este laboratório ao login do MKR Hub.

## Ambiente local

```powershell
Copy-Item .env.example .env
npm install
npm run build
npm run dev
```

Com o servidor em execução, verifique localmente:

```powershell
Invoke-RestMethod http://127.0.0.1:4000/health
```

Resposta:

```json
{ "ok": true, "service": "central-compras-api" }
```

## Scripts

- `npm run dev` — inicia a API local com recarga.
- `npm run build` — gera o Prisma Client local e compila TypeScript.
- `npm run start` — executa a versão compilada.
- `npm run prisma:generate` — gera somente o client, sem conectar ao banco.
- `npm exec prisma validate` — valida o contrato Prisma localmente, sem conectar ao banco.
- `npm run prisma:migrate` — reservado para uma futura homologação; não execute contra banco real.
- `npm run prisma:studio` — reservado para ambiente de homologação.

## Próximos passos

1. Revisar o contrato completo contra o inventário e aprovar um plano de importação descartável.
2. Definir política de senha inicial, cookies HttpOnly, expiração e revogação de sessão.
3. Criar PostgreSQL de teste isolado, somente quando autorizado, e validar uma importação sem dados de produção.
4. Implementar APIs, guardas e testes após aprovação explícita.
