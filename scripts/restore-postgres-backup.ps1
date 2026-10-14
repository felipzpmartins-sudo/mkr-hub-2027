param(
  [Parameter(Mandatory = $true)]
  [string]$RailwayService,

  [Parameter(Mandatory = $true)]
  [string]$BackupPath,

  [int]$TunnelPort = 0,

  [switch]$ContinueOnRestoreErrors,

  [string]$LogPath = '',

  [string[]]$Tables = @(),

  [switch]$SkipClean
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $BackupPath -PathType Leaf)) {
  throw "Backup não encontrado: $BackupPath"
}

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

if ($TunnelPort -gt 0) {
  $user = Get-RailwayVariable 'PGUSER'
  $password = Get-RailwayVariable 'PGPASSWORD'
  $database = Get-RailwayVariable 'PGDATABASE'
  if (-not $user -or -not $password -or -not $database) {
    throw "Não foi possível montar a conexão privada de $RailwayService."
  }

} else {
  throw 'A restauração exige um túnel privado Railway. Informe -TunnelPort.'
}

$backup = (Resolve-Path -LiteralPath $BackupPath).Path
$pgRestore = 'C:\Program Files\PostgreSQL\18\bin\pg_restore.exe'
if (-not (Test-Path -LiteralPath $pgRestore -PathType Leaf)) {
  throw 'pg_restore não foi encontrado. Instale o cliente PostgreSQL 18 antes de restaurar.'
}

$env:PGPASSWORD = $password
$env:PGSSLMODE = 'prefer'
$processOutput = Join-Path $env:TEMP ("central-compras-restore-$([guid]::NewGuid()).out")
$processError = Join-Path $env:TEMP ("central-compras-restore-$([guid]::NewGuid()).err")
try {
  $restoreArguments = @('--host', '127.0.0.1', '--port', $TunnelPort, '--username', $user, '--dbname', $database, '--no-owner', '--no-privileges')
  if (-not $SkipClean) { $restoreArguments += @('--clean', '--if-exists') }
  foreach ($table in $Tables) { $restoreArguments += "--table=$table" }
  $restoreArguments += $backup
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  & $pgRestore @restoreArguments 1> $processOutput 2> $processError
  $restoreExitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorActionPreference
  $restoreOutput = @()
  if (Test-Path -LiteralPath $processOutput) { $restoreOutput += Get-Content -LiteralPath $processOutput }
  if (Test-Path -LiteralPath $processError) { $restoreOutput += Get-Content -LiteralPath $processError }
} finally {
  Remove-Item -LiteralPath $processOutput, $processError -Force -ErrorAction SilentlyContinue
}

if ($LogPath) {
  $logDirectory = Split-Path -Parent $LogPath
  if ($logDirectory) { New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null }
  $restoreOutput | ForEach-Object { $_.ToString() } | Set-Content -LiteralPath $LogPath
}

$restoreOutput |
  Where-Object { $_.ToString() -match '(?i)(error|warning|fatal)' } |
  ForEach-Object { Write-Output $_ }

if ($restoreExitCode -ne 0) {
  if ($ContinueOnRestoreErrors) {
    Write-Warning 'A restauração concluiu com avisos de objetos Supabase não disponíveis neste PostgreSQL. Os dados compatíveis foram importados.'
    exit 0
  }

  throw "A restauração do backup falhou para $RailwayService."
}

Write-Output "Backup restaurado com sucesso no serviço $RailwayService."
