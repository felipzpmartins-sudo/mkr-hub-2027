param(
  [string]$CentralService = 'central-de-compras',
  [string]$DatabaseService = 'Postgres-8T5T'
)

$ErrorActionPreference = 'Stop'

$rawVariables = & npx --yes @railway/cli variable list --service $DatabaseService --json
if ($LASTEXITCODE -ne 0) { throw "Não foi possível ler as variáveis de $DatabaseService." }

$variables = $rawVariables | ConvertFrom-Json
if ($variables.variables) { $variables = $variables.variables }

if ($variables -is [System.Array]) {
  $databaseUrl = ($variables | Where-Object { $_.name -eq 'DATABASE_URL' } | Select-Object -First 1).value
} else {
  $databaseUrl = $variables.DATABASE_URL
}

if (-not $databaseUrl) { throw "DATABASE_URL não foi encontrada em $DatabaseService." }

& npx --yes @railway/cli variable set "DATABASE_URL=$databaseUrl" --service $CentralService --skip-deploys
if ($LASTEXITCODE -ne 0) { throw "Não foi possível atualizar DATABASE_URL em $CentralService." }

Write-Output "Conexão do $CentralService atualizada a partir de $DatabaseService."
