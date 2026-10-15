param(
  [string]$CentralService = 'central-de-marketing',
  [string]$CentralUrl = 'https://central-de-marketing-production.up.railway.app',
  [string]$VerificationEmail = 'lf473418@gmail.com'
)

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

function Invoke-HttpCheck {
  param(
    [string]$Name,
    [string]$Method,
    [string]$Uri,
    [hashtable]$Headers = @{},
    [object]$Body = $null,
    [int[]]$ExpectedStatus = @(200)
  )

  try {
    $arguments = @{
      Method = $Method
      Uri = $Uri
      Headers = $Headers
      UseBasicParsing = $true
    }
    if ($null -ne $Body) {
      $arguments.ContentType = 'application/json'
      $arguments.Body = $Body | ConvertTo-Json -Depth 8
    }
    $response = Invoke-WebRequest @arguments
    $status = [int]$response.StatusCode
  } catch {
    $status = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
  }

  [pscustomobject]@{
    check = $Name
    status = $status
    ok = $ExpectedStatus -contains $status
  }
}

$hubProvisionKey = Get-RailwayVariable 'CENTRAL_MARKETING_HUB_PROVISION_KEY'
if (-not $hubProvisionKey) { throw 'Chave de provisionamento do Marketing não encontrada.' }
$provisionHeaders = @{ 'x-hub-provision-key' = $hubProvisionKey }

$directory = Invoke-RestMethod -Uri "$CentralUrl/api/admin/users" -Headers $provisionHeaders
$initialUsers = @($directory.users)
$admin = $initialUsers | Where-Object { @($_.roles) -contains 'admin' } | Select-Object -First 1
if (-not $admin) { throw 'Nenhum administrador foi encontrado no banco restaurado.' }

$adminSession = Invoke-RestMethod -Method Post -Uri "$CentralUrl/api/auth/hub-provision" -ContentType 'application/json' -Headers $provisionHeaders -Body (@{
  email = $admin.email
  name = $admin.name
} | ConvertTo-Json)
$adminHeaders = @{ Authorization = "Bearer $($adminSession.access_token)" }

$checks = @()
$checks += Invoke-HttpCheck -Name 'health' -Method Get -Uri "$CentralUrl/health"
$checks += Invoke-HttpCheck -Name 'frontend' -Method Get -Uri "$CentralUrl/"
$checks += [pscustomobject]@{ check = 'restored_users_38'; status = 200; ok = ($initialUsers.Count -eq 38) }
$checks += [pscustomobject]@{ check = 'restored_admin'; status = 200; ok = [bool]$admin }
$checks += [pscustomobject]@{ check = 'hub_owner_account'; status = 200; ok = [bool]($initialUsers | Where-Object { $_.email -eq $VerificationEmail }) }
$checks += Invoke-HttpCheck -Name 'auth_user' -Method Get -Uri "$CentralUrl/auth/v1/user" -Headers $adminHeaders
$checks += Invoke-HttpCheck -Name 'auth_refresh' -Method Post -Uri "$CentralUrl/auth/v1/token?grant_type=refresh_token" -Body @{ refresh_token = $adminSession.refresh_token }
$checks += Invoke-HttpCheck -Name 'hub_directory_users' -Method Get -Uri "$CentralUrl/api/admin/users" -Headers $provisionHeaders

$temporaryUserId = $null
$temporaryRequestId = $null
$temporaryEmail = "auditoria-marketing-$([guid]::NewGuid())@example.invalid"
$temporaryPassword = "Audit-$([guid]::NewGuid())!"
try {
  $temporarySession = Invoke-RestMethod -Method Post -Uri "$CentralUrl/api/auth/hub-provision" -ContentType 'application/json' -Headers $provisionHeaders -Body (@{
    email = $temporaryEmail
    name = 'Auditoria Central de Marketing'
  } | ConvertTo-Json)
  $temporaryUserId = $temporarySession.user.id
  $userHeaders = @{ Authorization = "Bearer $($temporarySession.access_token)" }

  $checks += Invoke-HttpCheck -Name 'user_management_deactivate' -Method Post -Uri "$CentralUrl/api/admin/users/manage" -Headers $provisionHeaders -Body @{
    action = 'set_active'; user_id = $temporaryUserId; active = $false
  }
  $checks += Invoke-HttpCheck -Name 'disabled_hub_login' -Method Post -Uri "$CentralUrl/api/auth/hub-provision" -Headers $provisionHeaders -Body @{
    email = $temporaryEmail; name = 'Auditoria Central de Marketing'
  } -ExpectedStatus @(403)
  $checks += Invoke-HttpCheck -Name 'disabled_token_rejected' -Method Get -Uri "$CentralUrl/auth/v1/user" -Headers $userHeaders -ExpectedStatus @(401)
  $checks += Invoke-HttpCheck -Name 'user_management_activate' -Method Post -Uri "$CentralUrl/api/admin/users/manage" -Headers $provisionHeaders -Body @{
    action = 'set_active'; user_id = $temporaryUserId; active = $true
  }
  $checks += Invoke-HttpCheck -Name 'user_management_password' -Method Post -Uri "$CentralUrl/api/admin/users/manage" -Headers $provisionHeaders -Body @{
    action = 'reset_password'; user_id = $temporaryUserId; new_password = $temporaryPassword
  }
  $passwordSession = Invoke-RestMethod -Method Post -Uri "$CentralUrl/auth/v1/token?grant_type=password" -ContentType 'application/json' -Body (@{
    email = $temporaryEmail; password = $temporaryPassword
  } | ConvertTo-Json)
  $checks += [pscustomobject]@{ check = 'reset_password_login'; status = 200; ok = [bool]$passwordSession.access_token }
  $userHeaders = @{ Authorization = "Bearer $($passwordSession.access_token)" }

  $createdRequest = Invoke-RestMethod -Method Post -Uri "$CentralUrl/functions/v1/create-request" -Headers $userHeaders -ContentType 'application/json' -Body (@{
    requester_name = 'Auditoria Marketing'
    requester_whatsapp = '5519999999999'
    brand = 'MKR'
    request_type = 'Auditoria automatizada'
    description = 'Registro temporário criado pela auditoria automatizada.'
    deadline = (Get-Date).AddDays(7).ToString('yyyy-MM-dd')
  } | ConvertTo-Json)
  $temporaryRequestId = $createdRequest.id
  $checks += [pscustomobject]@{ check = 'request_create'; status = 200; ok = [bool]$temporaryRequestId }

  $ownRequests = @(Invoke-RestMethod -Uri "$CentralUrl/rest/v1/requests?select=*&id=eq.$temporaryRequestId" -Headers $userHeaders)
  $checks += [pscustomobject]@{ check = 'request_read'; status = 200; ok = ($ownRequests.Count -eq 1 -and $ownRequests[0].user_id -eq $temporaryUserId) }

  $updatedRequest = @(Invoke-RestMethod -Method Patch -Uri "$CentralUrl/rest/v1/requests?id=eq.$temporaryRequestId" -Headers ($userHeaders + @{ Prefer = 'return=representation' }) -ContentType 'application/json' -Body (@{
    notes = 'auditoria-atualizada'
  } | ConvertTo-Json))
  $checks += [pscustomobject]@{ check = 'request_update'; status = 200; ok = ($updatedRequest[0].notes -eq 'auditoria-atualizada') }

  $tracking = @(Invoke-RestMethod -Method Post -Uri "$CentralUrl/rest/v1/rpc/get_request_tracking" -Headers $userHeaders -ContentType 'application/json' -Body (@{
    token = $createdRequest.tracking_token
  } | ConvertTo-Json))
  $checks += [pscustomobject]@{ check = 'rpc_request_tracking'; status = 200; ok = ($tracking.Count -eq 1 -and $tracking[0].order_number) }

  $trackingAttachments = Invoke-WebRequest -Method Post -Uri "$CentralUrl/rest/v1/rpc/get_request_attachments" -Headers $userHeaders -ContentType 'application/json' -Body (@{
    token = $createdRequest.tracking_token
  } | ConvertTo-Json) -UseBasicParsing
  $checks += [pscustomobject]@{ check = 'rpc_request_attachments'; status = [int]$trackingAttachments.StatusCode; ok = ($trackingAttachments.Content.Trim() -eq '[]') }

  $auditObjectPath = "audit/$([guid]::NewGuid()).txt"
  $uploadResponse = Invoke-WebRequest -Method Post -Uri "$CentralUrl/storage/v1/object/request-attachments/$auditObjectPath" -Headers $userHeaders -ContentType 'text/plain' -Body ([Text.Encoding]::UTF8.GetBytes('central-marketing-storage-ok')) -UseBasicParsing
  $checks += [pscustomobject]@{ check = 'storage_upload'; status = [int]$uploadResponse.StatusCode; ok = ($uploadResponse.StatusCode -eq 200) }
  $downloadResponse = Invoke-WebRequest -Uri "$CentralUrl/storage/v1/object/request-attachments/$auditObjectPath" -Headers $userHeaders -UseBasicParsing
  $checks += [pscustomobject]@{ check = 'storage_download'; status = [int]$downloadResponse.StatusCode; ok = ($downloadResponse.Content -eq 'central-marketing-storage-ok') }
  $checks += Invoke-HttpCheck -Name 'storage_signed_url' -Method Post -Uri "$CentralUrl/storage/v1/object/sign/request-attachments/$auditObjectPath" -Headers $userHeaders -Body @{ expiresIn = 60 }
  $checks += Invoke-HttpCheck -Name 'storage_delete_cleanup' -Method Delete -Uri "$CentralUrl/storage/v1/object/request-attachments" -Headers $userHeaders -Body @{ prefixes = @($auditObjectPath) }

  $deletedRequest = @(Invoke-RestMethod -Method Delete -Uri "$CentralUrl/rest/v1/requests?id=eq.$temporaryRequestId" -Headers $userHeaders)
  $checks += [pscustomobject]@{ check = 'request_delete_cleanup'; status = 200; ok = ($deletedRequest.Count -eq 1) }
  $temporaryRequestId = $null
} catch {
  Write-Warning "Falha no ciclo funcional: $($_.Exception.Message)"
  $checks += [pscustomobject]@{ check = 'functional_roundtrip'; status = 0; ok = $false }
} finally {
  if ($temporaryRequestId) {
    $null = Invoke-RestMethod -Method Delete -Uri "$CentralUrl/rest/v1/requests?id=eq.$temporaryRequestId" -Headers $adminHeaders
  }
  if ($temporaryUserId) {
    $checks += Invoke-HttpCheck -Name 'user_delete_cleanup' -Method Post -Uri "$CentralUrl/functions/v1/admin-user-management" -Headers $adminHeaders -Body @{
      action = 'delete_user'; user_id = $temporaryUserId
    }
  }
}

foreach ($table in @('profiles', 'user_roles', 'requests', 'request_attachments', 'completed_attachments', 'webhook_logs', 'external_identity_mappings')) {
  $checks += Invoke-HttpCheck -Name "rest_$table" -Method Get -Uri "$CentralUrl/rest/v1/$table`?select=*&order=created_at.desc&limit=1" -Headers $adminHeaders
}
$checks += Invoke-HttpCheck -Name 'admin_list_users' -Method Post -Uri "$CentralUrl/functions/v1/admin-user-management" -Headers $adminHeaders -Body @{ action = 'list_users' }
$checks += Invoke-HttpCheck -Name 'rpc_identity_users' -Method Post -Uri "$CentralUrl/rest/v1/rpc/list_identity_users" -Headers $adminHeaders -Body @{}
$checks += Invoke-HttpCheck -Name 'report_csv' -Method Post -Uri "$CentralUrl/functions/v1/generate-report" -Headers $adminHeaders -Body @{}
$checks += Invoke-HttpCheck -Name 'storage_list' -Method Post -Uri "$CentralUrl/storage/v1/object/list/request-attachments" -Headers $adminHeaders -Body @{ prefix = ''; limit = 1; offset = 0 }

$finalDirectory = Invoke-RestMethod -Uri "$CentralUrl/api/admin/users" -Headers $provisionHeaders
$checks += [pscustomobject]@{ check = 'cleanup_user_count'; status = 200; ok = (@($finalDirectory.users).Count -eq $initialUsers.Count) }

$checks | Format-Table -AutoSize
$failed = @($checks | Where-Object { -not $_.ok })
if ($failed.Count -gt 0) {
  throw "$($failed.Count) verificações da API do Marketing falharam."
}
