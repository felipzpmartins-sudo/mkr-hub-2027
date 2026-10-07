param(
  [Parameter(Mandatory = $true)]
  [string]$RailwayService,

  [Parameter(Mandatory = $true)]
  [int]$TunnelPort
)

$ErrorActionPreference = 'Stop'
$rawVariables = & npx --yes @railway/cli variable list --service $RailwayService --json
if ($LASTEXITCODE -ne 0) { throw "Não foi possível ler as variáveis de $RailwayService." }

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
$psql = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'
if (-not (Test-Path -LiteralPath $psql -PathType Leaf)) { throw 'psql não foi encontrado.' }

$env:PGPASSWORD = $password
$env:PGSSLMODE = 'prefer'
$query = @'
SELECT table_schema || '.' || table_name
FROM information_schema.tables
WHERE table_type = 'BASE TABLE'
  AND table_schema IN ('public', 'auth', 'storage')
ORDER BY 1;
'@

& $psql --host '127.0.0.1' --port $TunnelPort --username $user --dbname $database --tuples-only --no-align --command $query
if ($LASTEXITCODE -ne 0) { throw "Não foi possível inspecionar $RailwayService." }

$counts = @'
SELECT 'auth.users=' || count(*) FROM auth.users;
SELECT 'public.profiles=' || count(*) FROM public.profiles;
'@
& $psql --host '127.0.0.1' --port $TunnelPort --username $user --dbname $database --tuples-only --no-align --command $counts
if ($LASTEXITCODE -ne 0) { throw "Não foi possível contar os registros de $RailwayService." }
