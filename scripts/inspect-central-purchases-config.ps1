param([string]$CentralService = 'central-de-compras')

$ErrorActionPreference = 'Stop'
$rawVariables = & npx --yes @railway/cli variable list --service $CentralService --json
if ($LASTEXITCODE -ne 0) { throw "Não foi possível ler as variáveis de $CentralService." }
$variables = $rawVariables | ConvertFrom-Json
if ($variables.variables) { $variables = $variables.variables }

function Get-RailwayVariable([string]$Name) {
  if ($variables -is [System.Array]) {
    return ($variables | Where-Object { $_.name -eq $Name } | Select-Object -First 1).value
  }
  return $variables.$Name
}

$databaseUrl = Get-RailwayVariable 'DATABASE_URL'
$databaseTarget = if ($databaseUrl) {
  $uri = [uri]$databaseUrl
  "$($uri.Host):$($uri.Port)$($uri.AbsolutePath)"
} else { $null }

[pscustomobject]@{
  service = $CentralService
  database_target = $databaseTarget
  vite_api_url = Get-RailwayVariable 'VITE_SUPABASE_URL'
  hub_provision_key = [bool](Get-RailwayVariable 'CENTRAL_PURCHASES_HUB_PROVISION_KEY')
  token_secret = [bool](Get-RailwayVariable 'CENTRAL_PURCHASES_TOKEN_SECRET')
  lovable_api_key = [bool](Get-RailwayVariable 'LOVABLE_API_KEY')
  twilio_api_key = [bool](Get-RailwayVariable 'TWILIO_API_KEY')
  lovable_send_url = [bool](Get-RailwayVariable 'LOVABLE_SEND_URL')
} | Format-List
