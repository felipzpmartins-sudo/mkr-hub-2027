param(
  [Parameter(Mandatory = $true)]
  [string]$RailwayService,

  [Parameter(Mandatory = $true)]
  [string]$OutputPath,

  [Parameter(Mandatory = $true)]
  [int]$TunnelPort
)

$ErrorActionPreference = 'Stop'

$rawVariables = & npx --yes @railway/cli variable list --service $RailwayService --json
if ($LASTEXITCODE -ne 0) {
  throw "Não foi possível ler as variáveis do serviço Railway $RailwayService."
}

$variables = $rawVariables | ConvertFrom-Json
if ($variables.variables) { $variables = $variables.variables }

function Get-RailwayVariable([string]$Name) {
  if ($variables -is [System.Array]) {
    return ($variables | Where-Object { $_.name -eq $Name } | Select-Object -First 1).value
  }

  return $variables.$Name
}

$user = Get-RailwayVariable 'PGUSER'
$password = Get-RailwayVariable 'PGPASSWORD'
$database = Get-RailwayVariable 'PGDATABASE'
if (-not $user -or -not $password -or -not $database) {
  throw "Não foi possível montar a conexão privada de $RailwayService."
}

$outputDirectory = Split-Path -Parent $OutputPath
if ($outputDirectory) {
  New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
}

$pgDump = 'C:\Program Files\PostgreSQL\18\bin\pg_dump.exe'
if (-not (Test-Path -LiteralPath $pgDump -PathType Leaf)) {
  throw 'pg_dump não foi encontrado. Instale o cliente PostgreSQL 18 antes de criar o backup.'
}

$env:PGPASSWORD = $password
$env:PGSSLMODE = 'prefer'
& $pgDump --host '127.0.0.1' --port $TunnelPort --username $user --format custom --file $OutputPath $database
if ($LASTEXITCODE -ne 0) {
  throw "Não foi possível criar a cópia de segurança do banco $RailwayService."
}

Write-Output "Backup criado com sucesso em $OutputPath"
