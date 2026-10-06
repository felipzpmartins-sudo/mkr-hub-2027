# SSO do Central de Compras

## Fluxo implementado

1. A pessoa entra no MKR HUB com o e-mail e a senha já cadastrados no Central de Compras.
2. O HUB confirma a senha com o Supabase do Central, preserva a conta existente e cria somente o vínculo local necessário para mostrar **Central de Compras** no dashboard. Uma conta ou vínculo desativado/revogado no HUB continua bloqueado.
3. Ao clicar em **Acessar sistema**, o HUB registra a auditoria e redireciona para `/auth/sso` do Central com um código opaco aleatório.
4. O Central envia esse código ao endpoint do HUB. O código só aceita a origem configurada, vence em 90 segundos e é removido no primeiro uso.
5. O Central recebe a sessão do Supabase, grava-a no cliente com `supabase.auth.setSession()` e abre a aplicação sem pedir a senha novamente.

Senha e tokens não entram na URL, nos logs ou na auditoria. Durante os 90 segundos, os tokens ficam cifrados com AES-256-GCM no banco do HUB.

## Configuração de produção

No serviço **MKR HUB** do Railway, defina:

```dotenv
CENTRAL_PURCHASES_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
CENTRAL_PURCHASES_SUPABASE_ANON_KEY="CHAVE_PUBLICA_DO_PROJETO"
CENTRAL_PURCHASES_ORIGIN="https://central-compras.seu-dominio.com"
HUB_SSO_ENCRYPTION_KEY="SEGREDO_ALEATORIO_EXCLUSIVO"
```

No serviço que compila o **Central de Compras**, defina durante o build:

```dotenv
VITE_MKR_HUB_SSO_EXCHANGE_URL="https://hub.seu-dominio.com/api/sso/central/exchange"
```

`CENTRAL_PURCHASES_ORIGIN` deve ser exatamente a origem pública do Central (protocolo e domínio). A URL cadastrada para o sistema `central-de-compras` no HUB deve usar essa mesma origem HTTPS e o status deve ser `ONLINE`.

Após publicar o HUB, aplique a migration antes de atender acessos:

```bash
npm run db:deploy
```

## Limites e próximos sistemas

Este fluxo é exclusivo do Central de Compras, que já utiliza Supabase Auth. Os demais sistemas só devem receber SSO depois de cada um validar um fluxo equivalente com código de uso único ou OpenID Connect; não compartilhe o cookie do HUB entre aplicações.
