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

$schemaQuery = @'
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'user_roles', 'approvers')
ORDER BY table_name, ordinal_position;
'@

& $psql --host '127.0.0.1' --port $TunnelPort --username $user --dbname $database --pset pager=off --command $schemaQuery
if ($LASTEXITCODE -ne 0) { throw "Não foi possível inspecionar os papéis em $RailwayService." }

$query = @'
WITH selected_emails AS (
  SELECT unnest(ARRAY[
    'financeiro@makergrupo.com.br',
    'controller@makergrupo.com.br',
    'ceo@makergrupo.com.br',
    'financeiro2@makergrupo.com.br'
  ]) AS email
), roles AS (
  SELECT user_id, array_agg(DISTINCT role ORDER BY role) AS roles
  FROM public.user_roles
  GROUP BY user_id
), approver_users AS (
  SELECT DISTINCT lower(email) AS email
  FROM public.approvers
)
SELECT
  u.email,
  COALESCE(NULLIF(p.full_name, ''), NULLIF(u.raw_user_meta_data ->> 'full_name', ''), NULLIF(u.raw_user_meta_data ->> 'name', ''), 'Sem nome') AS nome,
  COALESCE(array_to_string(r.roles, ', '), 'sem papel em public.user_roles') AS papeis,
  CASE WHEN a.email IS NULL THEN 'não' ELSE 'sim' END AS esta_em_aprovadores,
  u.created_at::date AS criado_em,
  u.last_sign_in_at AS ultimo_login,
  u.raw_user_meta_data::text AS metadados_autenticacao
FROM selected_emails s
LEFT JOIN auth.users u ON lower(u.email) = s.email
LEFT JOIN public.profiles p ON p.user_id = u.id
LEFT JOIN roles r ON r.user_id = u.id
LEFT JOIN approver_users a ON a.email = lower(u.email)
ORDER BY s.email;
'@

& $psql --host '127.0.0.1' --port $TunnelPort --username $user --dbname $database --pset pager=off --command $query
if ($LASTEXITCODE -ne 0) { throw "Não foi possível consultar os usuários em $RailwayService." }
