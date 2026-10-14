param(
  [string]$CentralService = 'central-de-compras',
  [string]$CentralUrl = 'https://central-de-compras-production.up.railway.app',
  [string]$VerificationEmail = 'compras@mkr.makergrupo.com.br'
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

$hubProvisionKey = Get-RailwayVariable 'CENTRAL_PURCHASES_HUB_PROVISION_KEY'
if (-not $hubProvisionKey) { throw 'Chave de provisionamento não encontrada.' }

$session = Invoke-RestMethod -Method Post -Uri "$CentralUrl/api/auth/hub-provision" -ContentType 'application/json' -Headers @{
  'x-hub-provision-key' = $hubProvisionKey
} -Body (@{ email = $VerificationEmail; name = 'Auditoria Central de Compras' } | ConvertTo-Json)

$authHeaders = @{ Authorization = "Bearer $($session.access_token)" }
$checks = @()
$checks += Invoke-HttpCheck -Name 'health' -Method Get -Uri "$CentralUrl/health"
$checks += Invoke-HttpCheck -Name 'frontend' -Method Get -Uri "$CentralUrl/"
$checks += Invoke-HttpCheck -Name 'auth_user' -Method Get -Uri "$CentralUrl/auth/v1/user" -Headers $authHeaders
$checks += Invoke-HttpCheck -Name 'auth_refresh' -Method Post -Uri "$CentralUrl/auth/v1/token?grant_type=refresh_token" -Body @{ refresh_token = $session.refresh_token }
$checks += Invoke-HttpCheck -Name 'hub_directory_users' -Method Get -Uri "$CentralUrl/api/admin/users" -Headers @{ 'x-hub-provision-key' = $hubProvisionKey }

$tables = @(
  'profiles', 'user_roles', 'solicitations', 'quotes', 'attachments',
  'approvals', 'status_history', 'approvers', 'approver_questions',
  'solicitation_messages', 'receipts', 'stock_activity_log'
)
foreach ($table in $tables) {
  $checks += Invoke-HttpCheck -Name "rest_$table" -Method Get -Uri "$CentralUrl/rest/v1/$table`?select=*&order=id.asc&limit=1" -Headers $authHeaders
}

$checks += Invoke-HttpCheck -Name 'admin_list_users' -Method Post -Uri "$CentralUrl/functions/v1/admin-user-management" -Headers $authHeaders -Body @{ action = 'list_users' }
$checks += Invoke-HttpCheck -Name 'rpc_approver_name' -Method Post -Uri "$CentralUrl/rest/v1/rpc/get_approver_display_name" -Headers $authHeaders -Body @{ _user_id = $session.user.id }
$checks += Invoke-HttpCheck -Name 'rpc_identity_users' -Method Post -Uri "$CentralUrl/rest/v1/rpc/list_identity_users" -Headers $authHeaders -Body @{}
$checks += Invoke-HttpCheck -Name 'rest_external_identities' -Method Get -Uri "$CentralUrl/rest/v1/external_identity_mappings?select=*&order=linked_at.desc&limit=1" -Headers $authHeaders
$checks += Invoke-HttpCheck -Name 'report_csv' -Method Post -Uri "$CentralUrl/functions/v1/generate-report" -Headers $authHeaders -Body @{}
$checks += Invoke-HttpCheck -Name 'email_validation' -Method Post -Uri "$CentralUrl/functions/v1/send-transactional-email" -Headers $authHeaders -Body @{} -ExpectedStatus @(400)
$checks += Invoke-HttpCheck -Name 'whatsapp_validation' -Method Post -Uri "$CentralUrl/functions/v1/notify-whatsapp" -Headers $authHeaders -Body @{} -ExpectedStatus @(400)
$checks += Invoke-HttpCheck -Name 'unsubscribe_validation' -Method Get -Uri "$CentralUrl/functions/v1/handle-email-unsubscribe?token=invalid-audit-token" -ExpectedStatus @(404)
$checks += Invoke-HttpCheck -Name 'storage_list' -Method Post -Uri "$CentralUrl/storage/v1/object/list/solicitation-attachments" -Headers $authHeaders -Body @{ prefix = ''; limit = 1; offset = 0 }

$firstSolicitation = @(Invoke-RestMethod -Uri "$CentralUrl/rest/v1/solicitations?select=*&order=created_at.asc&limit=1" -Headers $authHeaders)[0]
$temporaryMessageId = $null
if ($null -ne $firstSolicitation -and $firstSolicitation.id) {
  try {
    $createdMessage = Invoke-RestMethod -Method Post -Uri "$CentralUrl/rest/v1/solicitation_messages" -Headers ($authHeaders + @{ Prefer = 'return=representation' }) -ContentType 'application/json' -Body (@{
      solicitation_id = $firstSolicitation.id
      sender_id = $session.user.id
      channel = 'internal'
      message = "auditoria-$([guid]::NewGuid())"
    } | ConvertTo-Json)
    $temporaryMessageId = @($createdMessage)[0].id
    $checks += [pscustomobject]@{ check = 'crud_create'; status = if ($temporaryMessageId) { 201 } else { 0 }; ok = [bool]$temporaryMessageId }

    $updatedMessage = Invoke-RestMethod -Method Patch -Uri "$CentralUrl/rest/v1/solicitation_messages?id=eq.$temporaryMessageId" -Headers ($authHeaders + @{ Prefer = 'return=representation' }) -ContentType 'application/json' -Body (@{ message = 'auditoria-atualizada' } | ConvertTo-Json)
    $checks += [pscustomobject]@{ check = 'crud_update'; status = 200; ok = (@($updatedMessage)[0].message -eq 'auditoria-atualizada') }
  } catch {
    $checks += [pscustomobject]@{ check = 'crud_create_update'; status = 0; ok = $false }
  } finally {
    if ($temporaryMessageId) {
      $deletedMessage = Invoke-RestMethod -Method Delete -Uri "$CentralUrl/rest/v1/solicitation_messages?id=eq.$temporaryMessageId" -Headers $authHeaders
      $checks += [pscustomobject]@{ check = 'crud_delete_cleanup'; status = 200; ok = (@($deletedMessage).Count -eq 1) }
    }
  }
}

try {
  $headResponse = Invoke-WebRequest -Method Head -Uri "$CentralUrl/rest/v1/solicitation_messages?select=*&solicitation_id=eq.$($firstSolicitation.id)" -Headers ($authHeaders + @{ Prefer = 'count=exact' }) -UseBasicParsing
  $checks += [pscustomobject]@{ check = 'exact_count_header'; status = [int]$headResponse.StatusCode; ok = [bool]$headResponse.Headers['Content-Range'] }
} catch {
  $checks += [pscustomobject]@{ check = 'exact_count_header'; status = 0; ok = $false }
}

$auditObjectPath = "audit/$([guid]::NewGuid()).txt"
$multipart = $null
$httpClient = $null
try {
  Add-Type -AssemblyName System.Net.Http
  $httpClient = [System.Net.Http.HttpClient]::new()
  $httpClient.DefaultRequestHeaders.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $session.access_token)
  $multipart = [System.Net.Http.MultipartFormDataContent]::new()
  $fileBytes = [Text.Encoding]::UTF8.GetBytes('central-compras-storage-ok')
  $fileContent = [System.Net.Http.ByteArrayContent]::new($fileBytes)
  $fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::new('text/plain')
  $multipart.Add($fileContent, 'file', 'audit.txt')
  $uploadResponse = $httpClient.PostAsync("$CentralUrl/storage/v1/object/solicitation-attachments/$auditObjectPath", $multipart).Result
  $checks += [pscustomobject]@{ check = 'storage_upload'; status = [int]$uploadResponse.StatusCode; ok = $uploadResponse.IsSuccessStatusCode }

  $downloadResponse = $httpClient.GetAsync("$CentralUrl/storage/v1/object/solicitation-attachments/$auditObjectPath").Result
  $downloadBody = $downloadResponse.Content.ReadAsStringAsync().Result
  $checks += [pscustomobject]@{ check = 'storage_download'; status = [int]$downloadResponse.StatusCode; ok = ($downloadResponse.IsSuccessStatusCode -and $downloadBody -eq 'central-compras-storage-ok') }

  $deleteRequest = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Delete, "$CentralUrl/storage/v1/object/solicitation-attachments")
  $deleteRequest.Content = [System.Net.Http.StringContent]::new((@{ prefixes = @($auditObjectPath) } | ConvertTo-Json), [Text.Encoding]::UTF8, 'application/json')
  $deleteResponse = $httpClient.SendAsync($deleteRequest).Result
  $checks += [pscustomobject]@{ check = 'storage_delete_cleanup'; status = [int]$deleteResponse.StatusCode; ok = $deleteResponse.IsSuccessStatusCode }
} catch {
  Write-Warning "Falha no teste de armazenamento: $($_.Exception.Message)"
  $checks += [pscustomobject]@{ check = 'storage_roundtrip'; status = 0; ok = $false }
} finally {
  if ($multipart) { $multipart.Dispose() }
  if ($httpClient) { $httpClient.Dispose() }
}

$checks | Format-Table -AutoSize
$failed = @($checks | Where-Object { -not $_.ok })
if ($failed.Count -gt 0) {
  throw "$($failed.Count) verificações da API falharam."
}
