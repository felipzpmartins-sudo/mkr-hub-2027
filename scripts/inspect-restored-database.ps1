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
$identity = @'
SELECT 'database=' || current_database();
SELECT 'address=' || coalesce(inet_server_addr()::text, 'local');
SELECT 'auth.users=' || coalesce(to_regclass('auth.users')::text, 'missing');
SELECT 'public.profiles=' || coalesce(to_regclass('public.profiles')::text, 'missing');
'@
& $psql --host '127.0.0.1' --port $TunnelPort --username $user --dbname $database --tuples-only --no-align --command $identity
if ($LASTEXITCODE -ne 0) { throw "Não foi possível identificar $RailwayService." }

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
SELECT 'public.solicitations=' || count(*) FROM public.solicitations;
SELECT 'public.approvals=' || count(*) FROM public.approvals;
SELECT 'public.quotes=' || count(*) FROM public.quotes;
SELECT 'public.attachments=' || count(*) FROM public.attachments;
SELECT 'public.solicitation_messages=' || count(*) FROM public.solicitation_messages;
SELECT 'public.receipts=' || count(*) FROM public.receipts;
SELECT 'public.status_history=' || count(*) FROM public.status_history;
'@
& $psql --host '127.0.0.1' --port $TunnelPort --username $user --dbname $database --tuples-only --no-align --command $counts
if ($LASTEXITCODE -ne 0) { throw "Não foi possível contar os registros de $RailwayService." }
