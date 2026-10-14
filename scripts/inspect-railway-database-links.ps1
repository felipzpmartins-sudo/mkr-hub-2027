param(
  [string]$ApplicationService = 'central-de-compras',
  [string]$DatabaseService = 'Postgres-8T5T'
)

$ErrorActionPreference = 'Stop'

function Get-Variables([string]$Service) {
  $raw = & npx --yes @railway/cli variable list --service $Service --json
  if ($LASTEXITCODE -ne 0) { throw "Não foi possível ler as variáveis de $Service." }
  $variables = $raw | ConvertFrom-Json
  if ($variables.variables) { $variables = $variables.variables }
  return $variables
}

function Get-VariableValue($Variables, [string]$Name) {
  if ($Variables -is [System.Array]) {
    return ($Variables | Where-Object { $_.name -eq $Name } | Select-Object -First 1).value
  }
  return $Variables.$Name
}

function Get-ConnectionFingerprint([string]$Value) {
  if (-not $Value) { return $null }
  $bytes = [Text.Encoding]::UTF8.GetBytes($Value)
  $algorithm = [Security.Cryptography.SHA256]::Create()
  try {
    $hash = $algorithm.ComputeHash($bytes)
    return ([BitConverter]::ToString($hash)).Replace('-', '').Substring(0, 16)
  } finally {
    $algorithm.Dispose()
  }
}

function Get-ConnectionTarget([string]$Value) {
  if (-not $Value) { return $null }
  $uri = [uri]$Value
  return "$($uri.Host):$($uri.Port)$($uri.AbsolutePath)"
}

$applicationVariables = Get-Variables $ApplicationService
$databaseVariables = Get-Variables $DatabaseService
$applicationUrl = Get-VariableValue $applicationVariables 'DATABASE_URL'
$databaseUrl = Get-VariableValue $databaseVariables 'DATABASE_URL'

[pscustomobject]@{
  application_service = $ApplicationService
  database_service = $DatabaseService
  application_database_fingerprint = Get-ConnectionFingerprint $applicationUrl
  database_fingerprint = Get-ConnectionFingerprint $databaseUrl
  application_database_target = Get-ConnectionTarget $applicationUrl
  database_target = Get-ConnectionTarget $databaseUrl
  same_connection = (Get-ConnectionFingerprint $applicationUrl) -eq (Get-ConnectionFingerprint $databaseUrl)
  database_public_url_available = [bool](Get-VariableValue $databaseVariables 'DATABASE_PUBLIC_URL')
} | Format-List
