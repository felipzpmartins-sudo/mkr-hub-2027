param(
  [string]$CentralService = 'central-de-compras',
  [string]$CentralUrl = 'https://central-de-compras-production.up.railway.app',
  [string]$VerificationEmail = 'compras@mkr.makergrupo.com.br'
)

$ErrorActionPreference = 'Stop'

$rawVariables = & npx --yes @railway/cli variable list --service $CentralService --json
if ($LASTEXITCODE -ne 0) {
  throw "Não foi possível ler as variáveis de $CentralService."
}

$variables = $rawVariables | ConvertFrom-Json
if ($variables.variables) { $variables = $variables.variables }

function Get-RailwayVariable([string]$Name) {
  if ($variables -is [System.Array]) {
    return ($variables | Where-Object { $_.name -eq $Name } | Select-Object -First 1).value
  }

  return $variables.$Name
}

$hubProvisionKey = Get-RailwayVariable 'CENTRAL_PURCHASES_HUB_PROVISION_KEY'
if (-not $hubProvisionKey) {
  throw 'A chave de provisionamento do Central de Compras não foi encontrada.'
}

$session = Invoke-RestMethod -Method Post -Uri "$CentralUrl/api/auth/hub-provision" -ContentType 'application/json' -Headers @{
  'x-hub-provision-key' = $hubProvisionKey
} -Body (@{ email = $VerificationEmail; name = 'Verificação Central de Compras' } | ConvertTo-Json)

$headers = @{ Authorization = "Bearer $($session.access_token)" }
$profiles = @(Invoke-RestMethod -Uri "$CentralUrl/rest/v1/profiles?select=*&order=created_at.desc" -Headers $headers)
$solicitations = @(Invoke-RestMethod -Uri "$CentralUrl/rest/v1/solicitations?select=*&order=created_at.desc" -Headers $headers)
$adminUsers = Invoke-RestMethod -Method Post -Uri "$CentralUrl/functions/v1/admin-user-management" -ContentType 'application/json' -Headers $headers -Body (@{ action = 'list_users' } | ConvertTo-Json)

if ($profiles.Count -lt 1) { throw 'A API não retornou perfis.' }
if ($solicitations.Count -lt 1) { throw 'A API não retornou solicitações.' }
if (@($adminUsers.users).Count -lt 1) { throw 'A API não retornou usuários administrativos.' }

$expectedApprovers = @(
  'financeiro@makergrupo.com.br',
  'controller@makergrupo.com.br',
  'ceo@makergrupo.com.br',
  'financeiro2@makergrupo.com.br'
)
$returnedApprovers = @($adminUsers.users | Where-Object {
  $_.email -in $expectedApprovers -and $_.roles -contains 'requisition_approver'
})
if ($returnedApprovers.Count -ne $expectedApprovers.Count) {
  throw 'A API não refletiu todos os aprovadores cadastrados no banco restaurado.'
}

[pscustomobject]@{
  api_profiles = $profiles.Count
  api_solicitations = $solicitations.Count
  api_admin_users = @($adminUsers.users).Count
  api_approvers = $returnedApprovers.Count
  authenticated_email = $session.user.email
  result = 'OK'
} | Format-List
