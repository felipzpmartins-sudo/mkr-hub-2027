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

Este laboratório só pode usar um PostgreSQL local e descartável. Não use URL de Railway, Lovable, Supabase, produção ou qualquer banco que contenha dados reais.

Com PostgreSQL instalado localmente, crie um banco vazio e uma cópia local de ambiente:

```powershell
Copy-Item .env.example .env
# Edite apenas o .env local com DATABASE_URL apontando para o seu PostgreSQL descartável.
# Exemplo: postgresql://central_compras_lab_owner@127.0.0.1:55432/central_compras_lab?schema=public
npm install
npm exec prisma migrate dev --name init_central_compras_auth_schema
npm run seed:test-user
npm run build
npm run dev
```

`DATABASE_URL` no `.env` é ignorado pelo Git. `SESSION_SECRET` deve ser um valor exclusivo deste ambiente local; não reutilize nenhum segredo existente. O arquivo `.env.example` não contém credenciais.

### Validação local

Com o servidor em execução, valide o fluxo completo sem expor cookies ou tokens:

```powershell
npm run test:auth
```

O teste verifica `GET /health`, login, leitura da sessão, logout e a rejeição da sessão revogada. Ele usa somente o usuário local abaixo:

```json
{
  "id": "1aa040f0-3275-4a28-9aff-35a7fb811590",
  "email": "teste.central@local.test",
  "role": "admin"
}
```

A senha de laboratório é definida exclusivamente no script de seed e não deve ser usada fora deste banco descartável.

## Autenticação local inicial

- `POST /auth/login` valida e-mail e senha com bcrypt, cria um token aleatório e registra somente seu HMAC no banco.
- O token puro fica somente no cookie `central_compras_session`, com `HttpOnly`, `SameSite=Lax`, expiração configurável e `Secure` quando `NODE_ENV=production`.
- `GET /auth/me` encontra a sessão ativa e devolve apenas dados públicos do usuário, seus papéis e perfil básico. `passwordHash` nunca é retornado.
- `POST /auth/logout` revoga a sessão atual e invalida o cookie.

Esses endpoints são laboratório: não estão ligados ao frontend, não implementam SSO e não devem ser publicados ou apontados para ambientes reais.

## Autorização de laboratório

Em toda requisição com cookie de sessão válido, o gancho da API anexa apenas dados públicos em `request.auth`:

```ts
request.auth = {
  user: { id, email, fullName, phone, status },
  profile: { fullName, phone, department } | null,
  roles: ["admin"],
  session: { id, expiresAt },
};
```

Não há `passwordHash` nem token puro nesse contexto. Uma sessão ausente, expirada, revogada ou de usuário inativo não cria `request.auth`.

As guardas reutilizáveis disponíveis são `requireAuth`, `requireRole`, `requireAnyRole`, `requireAdmin`, `requireApprover` e `requireStock`. Elas só verificam autenticação e papéis neste momento; regras de negócio continuam fora de escopo.

Papéis inicialmente reconhecidos pelo contrato: `admin`, `requisition_approver`, `stock` e `user`. O seed local recebe apenas `admin`, portanto ele deve receber `403 Forbidden` na rota de aprovador.

Rotas laboratoriais protegidas:

- `GET /debug/protected` — exige sessão;
- `GET /debug/admin` — exige `admin`;
- `GET /debug/approver` — exige `requisition_approver`;
- `GET /profile/me` — exige sessão e retorna usuário, perfil e papéis, sem dados sigilosos.

Os erros seguem o formato `{ "error": { "code", "message" } }`, com códigos para `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`, `NOT_FOUND` e `INTERNAL_ERROR`.

## Scripts

- `npm run dev` — inicia a API local com recarga.
- `npm run build` — gera o Prisma Client local e compila TypeScript.
- `npm run start` — executa a versão compilada.
- `npm run prisma:generate` — gera somente o client, sem conectar ao banco.
- `npm exec prisma validate` — valida o contrato Prisma localmente, sem conectar ao banco.
- `npm run prisma:migrate` — aplica migration somente em um banco descartável explicitamente configurado no `.env` local.
- `npm run prisma:studio` — reservado para ambiente de homologação.
- `npm run seed:test-user` — cria ou atualiza somente o usuário de teste local.
- `npm run test:auth` — executa a validação manual automatizada contra a API local já iniciada.

## Próximos passos

1. Revisar o contrato completo contra o inventário e aprovar um plano de importação descartável.
2. Definir política de senha inicial, cookies HttpOnly, expiração e revogação de sessão.
3. Ampliar testes de autenticação e autorização antes de conectar qualquer frontend.
4. Planejar uma importação descartável e sem dados de produção, somente após aprovação explícita.
