# MKR HUB

Portal corporativo de identidade, permissões e acesso aos sistemas internos. Desenvolvido com Next.js (App Router), TypeScript, Tailwind CSS, Auth.js, Prisma e PostgreSQL.

## O que está implementado

- Login com e-mail e senha, sem cadastro público.
- Dashboard, busca de sistemas, sidebar responsiva e perfil com alteração de senha.
- Administração de usuários, sistemas, permissões e consulta paginada de auditoria.
- Desativação de usuários, sem exclusão física.
- Perfis independentes por sistema e vínculo com contas externas por ID e e-mail.
- Verificação de autorização no servidor antes de redirecionar para um sistema.
- Seed idempotente dos cinco sistemas iniciais; sem URLs ou credenciais reais no código.
- Página de configurações com políticas efetivas e estado do catálogo.
- Health check, migration inicial e configuração de deploy no Railway.

Os bancos dos sistemas externos continuam independentes. Esta versão implementa SSO somente para o Central de Compras; os demais sistemas seguem com integrações independentes.

## Requisitos

- Node.js 22.12 ou superior (a imagem de produção usa Node 22).
- npm.
- PostgreSQL acessível por uma conexão direta `postgresql://`.

## Instalação e ambiente

```bash
npm ci
```

Copie `.env.example` para `.env`. No PowerShell:

```powershell
Copy-Item .env.example .env
```

Configure:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/mkr_hub?schema=public"
AUTH_SECRET="SEGREDO_ALEATORIO_GERADO_LOCALMENTE"
AUTH_URL="http://localhost:3000"
AUTH_TRUST_HOST="true"
TRUST_PROXY="false"
CENTRAL_PURCHASES_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
CENTRAL_PURCHASES_SUPABASE_ANON_KEY="SUA_CHAVE_PUBLICA_DO_SUPABASE"
CENTRAL_PURCHASES_ORIGIN="https://central-compras.exemplo.com"
HUB_SSO_ENCRYPTION_KEY="SEGREDO_ALEATORIO_EXCLUSIVO_PARA_SSO"
```

Esses valores são placeholders. Use um banco exclusivo para o HUB. Caracteres especiais na senha da conexão precisam de percent-encoding. Em produção, use a conexão e a configuração TLS fornecidas pelo serviço de PostgreSQL; não desabilite a verificação do certificado.

Gere um segredo forte para `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Não versione `.env`. O projeto o exclui tanto do Git quanto do contexto do Docker. Consulte [docs/CENTRAL-DE-COMPRAS-SSO.md](docs/CENTRAL-DE-COMPRAS-SSO.md) para configurar as variáveis no HUB e no build do Central de Compras.

Se o PowerShell bloquear `npm.ps1` ou `npx.ps1`, use `npm.cmd` e `npx.cmd`. Não é necessário alterar a política de execução do Windows.

## Banco e migrations

Para aplicar as migrations versionadas a uma base vazia ou a um ambiente existente:

```bash
npm run db:deploy
npm run db:seed
```

Para desenvolver novas alterações de schema:

```bash
npm run db:migrate -- --name descricao_da_alteracao
```

`prisma/schema.prisma` define `User`, `System`, `UserSystemAccess`, `AuditLog` e `LoginAttempt`. O Prisma Client é gerado no `postinstall` e no build, em `src/generated/prisma`.

O seed pode ser executado novamente: ele não substitui URLs, status ou alterações de sistemas existentes. Inicialmente, as URLs ficam vazias e o status é `OFFLINE`.

## Primeiro administrador

Defina temporariamente em `.env` ou no ambiente do terminal:

```dotenv
ADMIN_NAME="NOME_DO_ADMINISTRADOR"
ADMIN_EMAIL="EMAIL_REAL_DO_ADMINISTRADOR"
ADMIN_PASSWORD="SENHA_FORTE_ESCOLHIDA_POR_VOCE"
```

A senha deve ter ao menos 12 caracteres e no máximo 72 bytes. Execute:

```bash
npm run admin:create
```

O comando cria o primeiro administrador com senha protegida por bcrypt e registra `USER_CREATED`. Se já existir um administrador ativo, ele recusa a operação: outros usuários devem ser criados pelo painel. Ele não sobrescreve uma conta existente nem redefine sua senha.

Remova `ADMIN_PASSWORD` e as demais variáveis de bootstrap depois da criação. Nunca inclua senhas em argumentos de linha de comando ou commits.

## Iniciar localmente

```bash
npm run dev
```

Abra `http://localhost:3000` e faça login com a conta criada. Para testar a versão compilada:

```bash
npm run build
npm run start
```

### Configuração inicial pelo painel

1. Em **Sistemas**, configure a URL HTTPS real e o status de cada aplicação.
2. Em **Usuários**, crie as contas internas.
3. Abra cada usuário e configure **Acesso aos sistemas**: habilitação, perfil, ID externo e e-mail externo, quando conhecidos.
4. Conceda explicitamente os acessos da própria conta administrativa. Ser administrador do HUB não concede acesso automático às aplicações.
5. Confira a matriz em **Permissões** e os registros em **Logs**.

O status do sistema é manual; `ONLINE` não representa uma verificação automática de disponibilidade. O usuário vê somente aplicações com acesso habilitado. Sistemas offline ou em manutenção aparecem com acesso indisponível.

As URLs são armazenadas no banco e aceitam HTTPS sem credenciais, query string ou fragmento. O botão **Acessar** envia uma Server Action, revalida o usuário e a permissão e grava `SYSTEM_ACCESSED`. Para o Central de Compras, ele emite um código opaco, de uso único e curto; o Central o troca por uma sessão Supabase sem nova senha. Outras aplicações podem pedir seu próprio login.

## Segurança e decisões de implementação

- Auth.js Credentials com sessão JWT criptografada, cookies HttpOnly e proteção de CSRF da biblioteca. Em produção, configure `AUTH_URL` com HTTPS para cookies seguros.
- O projeto usa a linha 5 beta do Auth.js, fixada no lockfile. A versão selecionada contém as correções identificadas na auditoria de dependências desta entrega.
- `sessionVersion` é conferida no banco junto com o status do usuário. Desativação, atualização administrativa, troca de senha e logout revogam sessões anteriores. O logout encerra todas as sessões da conta.
- O proxy (`src/proxy.ts`, nome adotado pelo Next.js 16 para o middleware) faz a primeira barreira de autenticação. Pages e Server Actions revalidam a sessão e o papel administrativo no servidor.
- O papel `hubRole` é separado da string `role` de cada vínculo. `ADMIN` no HUB não representa `ADMIN` em outros sistemas.
- Senhas com bcrypt, custo 12; e-mails normalizados; validação com Zod; mensagens de falha de login genéricas.
- Limite persistente em PostgreSQL: 8 tentativas por e-mail a cada 15 minutos, incluindo logins bem-sucedidos. Se o IP confiável estiver habilitado, também há limite de 60 tentativas por IP no mesmo intervalo. Contadores expirados são removidos nas próximas tentativas.
- `TRUST_PROXY` vem desabilitado. Habilite somente quando a infraestrutura substituir `x-forwarded-for` por um valor confiável; sem isso, o IP fica ausente nos logs, e o limite por e-mail continua ativo.
- Alterações administrativas e seus registros de auditoria são atômicos. Não há interface para excluir auditoria ou usuários.
- O administrador não pode desativar nem rebaixar sua própria conta. As alterações de administradores usam um lock transacional para preservar pelo menos um administrador ativo.
- Logs registram ator, ação, destino, data, IP quando confiável e metadados selecionados. Senhas e tokens não são gravados em metadados.
- O banco do HUB não armazena senhas de aplicações externas. Na passagem SSO, os tokens do Central ficam cifrados por no máximo 90 segundos e são removidos no primeiro uso; eles não entram na URL, nos logs ou na auditoria.

O usuário da aplicação no PostgreSQL deve ter apenas os privilégios necessários. Backups, retenção dos logs, gestão de segredos e acesso administrativo à infraestrutura são políticas operacionais da empresa. As políticas exibidas em **Configurações** são versionadas em código; a tela não contém opções sem efeito.

## Deploy no Railway

O repositório inclui `Dockerfile`, `.dockerignore` e `railway.json`. O deploy não é executado automaticamente por este projeto.

1. Publique o projeto em um repositório privado e conecte-o a um novo serviço no Railway.
2. Adicione um serviço PostgreSQL exclusivo do HUB.
3. No serviço web, configure `DATABASE_URL` com uma referência à conexão do PostgreSQL, `AUTH_SECRET` com um segredo forte, `AUTH_URL` com o domínio HTTPS público e `AUTH_TRUST_HOST=true`. Para o Central de Compras, configure também as quatro variáveis `CENTRAL_PURCHASES_*` e `HUB_SSO_ENCRYPTION_KEY` descritas em `docs/CENTRAL-DE-COMPRAS-SSO.md`.
4. Mantenha `TRUST_PROXY=false` até confirmar a sanitização de `x-forwarded-for` pelo proxy utilizado.
5. O Railway utilizará o Dockerfile. O comando de pré-deploy aplica `npm run db:deploy`; o início usa `npm run start`, que respeita a variável `PORT` e escuta em `0.0.0.0`.
6. Após o primeiro deploy, execute **dentro do container do serviço web** `npm run db:seed` e `npm run admin:create`, com as variáveis temporárias do administrador configuradas. Isso permite usar a conexão privada do PostgreSQL. Remova as variáveis de bootstrap em seguida.
7. Abra o domínio, entre e configure os sistemas e permissões.

O health check em `/api/health` verifica a conexão com o PostgreSQL e retorna somente `ok` ou `unavailable`. O domínio público do HUB deve permanecer estável em `AUTH_URL`. Mudanças de `AUTH_SECRET` invalidam todas as sessões.

O container roda como usuário `node`. Prisma CLI e `tsx` são mantidos na imagem para suportar migrations, seed e provisionamento. Não execute `prisma migrate dev` em produção.

## Testes e verificações

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Os testes unitários verificam autorização, sessões revogadas, validação de credenciais e URLs, perfis externos e a barreira de acesso aos sistemas. O teste integrado cria um PostgreSQL isolado, aplica migrations, executa o seed duas vezes para confirmar idempotência e inicia o build de produção em uma porta livre.

As credenciais de teste são aleatórias, temporárias e limitadas à instância isolada. Não são utilizadas na configuração local ou no banco real. Os testes cobrem a criação de usuários, configuração de sistemas, vínculos legados, acesso por perfil, bloqueio de contas inativas, troca de senha, logout, limites de login e auditoria. O redirecionamento externo usa um domínio reservado de exemplo e é interceptado pelo navegador de teste.

No Windows, os testes usam o Chrome instalado. É possível definir `TEST_BROWSER_CHANNEL=msedge`. O script converte caminhos com acentos para o formato curto usado pelos binários PostgreSQL. Em Linux/macOS, instale o navegador com `npx playwright install chromium`. Execute com um usuário comum, não como root.

Capturas de tela e dados isolados ficam em `.local/e2e-*`, ignorados pelo Git. Os serviços temporários são encerrados ao terminar. `test-results` contém evidências de falhas. O teste integrado requer permissão para iniciar processos e abrir portas locais.

## Organização

```text
src/
  app/             páginas, layouts, API e Server Actions
  components/      formulários e componentes reutilizáveis
  lib/             Prisma, validação, senhas e utilitários
  repositories/    consultas reutilizáveis
  services/        autorização e limitação de login
  types/           contratos de sessão e formulários
  auth.ts          configuração Auth.js
  proxy.ts         barreira inicial de autenticação
prisma/            schema, migrations e seed
scripts/           provisionamento e teste integrado
tests/             testes unitários e de navegador
docs/              evolução da identidade e do SSO
```

## Evolução para SSO

Consulte [docs/CENTRAL-DE-COMPRAS-SSO.md](docs/CENTRAL-DE-COMPRAS-SSO.md) para configurar o Central de Compras. As próximas integrações devem usar um fluxo equivalente de código de uso único ou OpenID Connect, preservando identificadores e bancos existentes.

## Referências

- [Auth.js: Credentials](https://authjs.dev/getting-started/authentication/credentials)
- [Next.js: Proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
- [Prisma: configuração e atualização para v7](https://docs.prisma.io/docs/guides/upgrade-prisma-orm/v7)
- [PostgreSQL isolado para testes](https://github.com/leinelissen/embedded-postgres)

As dependências transitivas `deepmerge-ts` e `mysql2`, utilizadas pela ferramenta Prisma, têm overrides para versões corrigidas. As verificações de schema, migrations, testes e build devem acompanhar futuras atualizações desses overrides.
