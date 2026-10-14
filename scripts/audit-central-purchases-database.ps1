param(
  [string]$RailwayService = 'Postgres-8T5T',
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

$env:PGPASSWORD = Get-RailwayVariable 'PGPASSWORD'
$env:PGSSLMODE = 'prefer'
$database = Get-RailwayVariable 'PGDATABASE'
$user = Get-RailwayVariable 'PGUSER'
$psql = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'
if (-not (Test-Path -LiteralPath $psql -PathType Leaf)) { throw 'psql não foi encontrado.' }

$query = @'
SELECT 'database_identity' AS check_name,
       current_database() || '@' || coalesce(inet_server_addr()::text, 'local') AS result;

SELECT 'duplicate_auth_emails' AS check_name, count(*)::text AS result
FROM (
  SELECT lower(email)
  FROM auth.users
  WHERE email IS NOT NULL
  GROUP BY lower(email)
  HAVING count(*) > 1
) duplicated;

SELECT 'users_without_profile' AS check_name, count(*)::text AS result
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

SELECT 'profiles_without_user' AS check_name, count(*)::text AS result
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.user_id
WHERE u.id IS NULL;

SELECT 'approvers_without_user' AS check_name, count(*)::text AS result
FROM public.approvers a
LEFT JOIN auth.users u ON lower(u.email) = lower(a.email)
WHERE u.id IS NULL;

SELECT 'database_functions' AS check_name,
       string_agg(p.proname, ', ' ORDER BY p.proname) AS result
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public';

SELECT p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       pg_get_function_result(p.oid) AS result_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY p.proname;

SELECT 'database_triggers' AS check_name, count(*)::text AS result
FROM information_schema.triggers
WHERE trigger_schema = 'public';

SELECT 'foreign_keys' AS check_name, count(*)::text AS result
FROM information_schema.table_constraints
WHERE constraint_schema = 'public'
  AND constraint_type = 'FOREIGN KEY';

SELECT 'storage_objects' AS check_name, count(*)::text AS result FROM storage.objects;
SELECT 'storage_buckets' AS check_name, count(*)::text AS result FROM storage.buckets;
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
ORDER BY id;

SELECT table_name, row_count
FROM (
  SELECT 'approvals' AS table_name, count(*) AS row_count FROM public.approvals
  UNION ALL SELECT 'approver_questions', count(*) FROM public.approver_questions
  UNION ALL SELECT 'approvers', count(*) FROM public.approvers
  UNION ALL SELECT 'attachments', count(*) FROM public.attachments
  UNION ALL SELECT 'email_send_log', count(*) FROM public.email_send_log
  UNION ALL SELECT 'email_send_state', count(*) FROM public.email_send_state
  UNION ALL SELECT 'email_unsubscribe_tokens', count(*) FROM public.email_unsubscribe_tokens
  UNION ALL SELECT 'external_identity_mappings', count(*) FROM public.external_identity_mappings
  UNION ALL SELECT 'profiles', count(*) FROM public.profiles
  UNION ALL SELECT 'quotes', count(*) FROM public.quotes
  UNION ALL SELECT 'receipts', count(*) FROM public.receipts
  UNION ALL SELECT 'solicitation_messages', count(*) FROM public.solicitation_messages
  UNION ALL SELECT 'solicitations', count(*) FROM public.solicitations
  UNION ALL SELECT 'status_history', count(*) FROM public.status_history
  UNION ALL SELECT 'stock_activity_log', count(*) FROM public.stock_activity_log
  UNION ALL SELECT 'suppressed_emails', count(*) FROM public.suppressed_emails
  UNION ALL SELECT 'user_roles', count(*) FROM public.user_roles
  UNION ALL SELECT 'central_storage_files', count(*) FROM public.central_storage_files
) counts
ORDER BY table_name;
'@

& $psql --host '127.0.0.1' --port $TunnelPort --username $user --dbname $database --set ON_ERROR_STOP=on --pset pager=off --command $query
if ($LASTEXITCODE -ne 0) { throw "A auditoria do banco $RailwayService falhou." }
