param(
  [string]$ApplicationService = 'central-de-compras',
  [string]$DatabaseService = 'Postgres-8T5T',
  [int]$TunnelPort = 6550,
  [int]$Port = 4180
)

$ErrorActionPreference = 'Stop'
function Get-ServiceVariables([string]$Service) {
  $raw = & npx --yes @railway/cli variable list --service $Service --json
  if ($LASTEXITCODE -ne 0) { throw "Não foi possível ler as variáveis de $Service." }
  $values = $raw | ConvertFrom-Json
  if ($values.variables) { $values = $values.variables }
  return $values
}

function Get-VariableValue($Values, [string]$Name) {
  if ($Values -is [System.Array]) {
    return ($Values | Where-Object { $_.name -eq $Name } | Select-Object -First 1).value
  }
  return $Values.$Name
}

$application = Get-ServiceVariables $ApplicationService
$database = Get-ServiceVariables $DatabaseService
$databaseUser = Get-VariableValue $database 'PGUSER'
$databasePassword = [uri]::EscapeDataString((Get-VariableValue $database 'PGPASSWORD'))
$databaseName = Get-VariableValue $database 'PGDATABASE'

$env:DATABASE_URL = "postgresql://${databaseUser}:${databasePassword}@127.0.0.1:${TunnelPort}/${databaseName}"
$env:CENTRAL_PURCHASES_HUB_PROVISION_KEY = Get-VariableValue $application 'CENTRAL_PURCHASES_HUB_PROVISION_KEY'
$env:CENTRAL_PURCHASES_TOKEN_SECRET = Get-VariableValue $application 'CENTRAL_PURCHASES_TOKEN_SECRET'
$env:LOVABLE_API_KEY = Get-VariableValue $application 'LOVABLE_API_KEY'
$env:TWILIO_API_KEY = Get-VariableValue $application 'TWILIO_API_KEY'
$env:PORT = $Port

& node .\server\index.js
