# Central de Compras API — laboratório

Este é o esqueleto do backend próprio da Central de Compras. Ele é isolado do MKR Hub e do frontend Vite em `../central-compras` e não substitui a Central em produção.

## Limites desta etapa

- Há somente um endpoint: `GET /health`.
- Não há rotas de autenticação, acesso a banco, Storage, SSO, migration ou integração externa implementados.
- O cliente Prisma é preguiçoso: o servidor não abre conexão com PostgreSQL até que uma rota futura chame `getPrisma()`.
- Nunca informe neste diretório URL, senha, token ou chave de ambientes Lovable, Supabase ou produção.

## UUIDs legados

Na migração, `users.id` deverá receber o UUID existente em `auth.users.id` do Supabase. Os UUIDs de relacionamentos históricos também serão preservados. Sessões e tokens temporários não serão migrados.

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
- `npm run prisma:migrate` — reservado para uma futura homologação; não execute contra banco real.
- `npm run prisma:studio` — reservado para ambiente de homologação.

## Próximos passos

1. Definir o schema Prisma completo a partir de um backup/schema real autorizado.
2. Criar autenticação própria preservando UUIDs.
3. Implementar APIs e guardas de autorização por domínio.
4. Adicionar Railway Bucket, worker, e-mail e WhatsApp somente em homologação.
