# Central de Compras — laboratório isolado

Esta pasta é uma cópia de trabalho do frontend Vite da Central de Compras. Ela vive dentro do repositório do MKR Hub apenas para facilitar backup e evolução controlada. Não integra o Next.js, o login, o banco ou o deploy do Hub.

## Limites desta cópia

- A Central original continua sendo a referência e não deve ser alterada por este laboratório.
- Não há SSO, redirecionamento pelo Hub, compartilhamento de sessão ou alteração de DNS.
- Não use URL, chaves, usuários, banco, bucket ou funções da produção/Lovable nesta pasta.
- `supabase/migrations/` e `supabase/functions/` são uma referência de código. Não aplique migrations, não faça `db push` e não execute deploy de funções a partir deste diretório.
- `docs/pending-migrations/20260930170000_external_identity_mappings.sql` permanece deliberadamente pendente e não deve ser aplicado.

## Ambiente de teste futuro

Quando existir um ambiente exclusivo de homologação, copie `.env.example` para `.env` e informe somente as credenciais públicas desse ambiente. Nunca versione `.env`.

```powershell
Copy-Item .env.example .env
npm ci
npm run dev
```

O Vite abre, por padrão, em `http://localhost:5173`. Antes de testar qualquer ação que grave dados, confirme que as duas variáveis apontam para a homologação exclusiva. Sem `.env`, o app não deve ser usado para operações.

## Build independente

```powershell
npm ci
npm run build
```

O build desta pasta é independente do MKR Hub. Para proteger o Hub, sua verificação continua sendo executada na raiz do repositório:

```powershell
npm run build
```

## Organização

```text
apps/central-compras/  # aplicação Vite isolada
src/                   # frontend React da Central
supabase/              # referência de migrations e Edge Functions; não executar
```

Não inclua `.env`, `node_modules`, `dist`, chaves privadas, exportações de dados ou arquivos de Storage neste repositório.
