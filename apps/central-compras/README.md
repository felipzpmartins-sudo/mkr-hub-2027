# Central de Compras — laboratório isolado

Esta é uma cópia de trabalho do frontend Vite da Central de Compras dentro do repositório do MKR Hub. Ela não integra o Next.js, login, banco ou deploy do Hub.

## Escopo atual

O login da cópia usa exclusivamente a API local em `apps/central-compras-api`:

- `POST /auth/login` cria uma sessão por cookie `HttpOnly`;
- `GET /auth/me` e `GET /profile/me` restauram a sessão e mostram perfil e papéis no painel inicial;
- `POST /auth/logout` revoga a sessão e retorna ao login;
- nenhum token ou senha é gravado no `localStorage` ou no frontend.

O painel inicial é propositalmente apenas de identidade. Solicitações, aprovações, estoque, anexos, notificações, criação de contas e recuperação de senha continuam fora deste fluxo. O código legado do Supabase é mantido como referência, mas essas telas não são expostas pelo roteamento do laboratório até que cada módulo seja conectado à API local. O campo legado `must_reset_password` é mapeado como `mustResetPassword`; ele bloqueia o acesso, pois a redefinição de senha própria ainda não foi implementada.

## Limites de segurança

- Não altera a Central original, Lovable, Supabase, Railway, DNS, SSO ou produção.
- Não use URL, chave, usuário, banco, bucket ou função da produção nesta pasta.
- Não aplique migrations, `db push` ou deploy a partir daqui.
- `supabase/migrations/` e `supabase/functions/` são somente referências históricas.
- `docs/pending-migrations/20260930170000_external_identity_mappings.sql` permanece deliberadamente pendente.

## Execução local

1. Na API, crie um `.env` local baseado no `.env.example`. Use somente o PostgreSQL descartável local e configure `CORS_ORIGIN="http://localhost:8080"`.
2. Inicie a API em `apps/central-compras-api`:

```powershell
npm run dev
```

3. No frontend, crie `apps/central-compras/.env` contendo apenas:

```dotenv
VITE_CENTRAL_API_URL="http://localhost:4000"
```

4. Inicie o Vite em `apps/central-compras`:

```powershell
npm run dev
```

O Vite usa `http://localhost:8080`. O cookie é enviado apenas entre esse frontend local e a API local configurada.

## Conta de teste local

Após executar o seed da API, use a conta de laboratório descrita no README da API. Ela não pertence à Central de produção e só funciona no banco PostgreSQL local descartável.

## Build independente

```powershell
npm run build
```

O build desta pasta é independente do MKR Hub. O build do Hub continua sendo executado na raiz do repositório.

Não versione `.env`, `node_modules`, `dist`, chaves privadas, exportações de dados ou arquivos de Storage.
