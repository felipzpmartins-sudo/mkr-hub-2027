$ErrorActionPreference = 'Stop'

$secretBytes = New-Object byte[] 48
$random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$random.GetBytes($secretBytes)
$random.Dispose()
$sharedSecret = [Convert]::ToBase64String($secretBytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
$hubUrl = 'https://mkr-hub-2027-production.up.railway.app'
$purchasesUrl = 'https://central-de-compras-production.up.railway.app'

& npx --yes @railway/cli variable set "DATABASE_URL=`${{Postgres-8T5T.DATABASE_URL}}" --service central-de-compras --skip-deploys
& npx --yes @railway/cli variable set "CENTRAL_PURCHASES_HUB_PROVISION_KEY=$sharedSecret" --service central-de-compras --skip-deploys
& npx --yes @railway/cli variable set "CENTRAL_PURCHASES_TOKEN_SECRET=$sharedSecret" --service central-de-compras --skip-deploys
& npx --yes @railway/cli variable set "VITE_SUPABASE_URL=$purchasesUrl" --service central-de-compras --skip-deploys
& npx --yes @railway/cli variable set 'VITE_SUPABASE_PUBLISHABLE_KEY=mkr-hub-local-api' --service central-de-compras --skip-deploys
& npx --yes @railway/cli variable set "VITE_MKR_HUB_URL=$hubUrl" --service central-de-compras --skip-deploys
& npx --yes @railway/cli variable set "VITE_MKR_HUB_SSO_EXCHANGE_URL=$hubUrl/api/sso/exchange" --service central-de-compras --skip-deploys
& npx --yes @railway/cli variable set "CENTRAL_PURCHASES_API_URL=$purchasesUrl" --service mkr-hub-2027 --skip-deploys
& npx --yes @railway/cli variable set "CENTRAL_PURCHASES_HUB_PROVISION_KEY=$sharedSecret" --service mkr-hub-2027 --skip-deploys

if ($LASTEXITCODE -ne 0) { throw 'Não foi possível configurar as variáveis do Central de Compras.' }
Write-Output 'Variáveis da API própria do Central de Compras configuradas.'
