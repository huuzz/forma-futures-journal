param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$appRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $appRoot
$env:NEXT_TELEMETRY_DISABLED = '1'
try {
  $nodeCommand = (Get-Command node -ErrorAction Stop).Source
  $majorVersion = [int]((& $nodeCommand --version).TrimStart('v').Split('.')[0])
  if ($majorVersion -lt 24) { throw 'Install Node.js 24 LTS or newer, then open Start Journal again.' }
  if (-not (Test-Path -LiteralPath 'node_modules\next')) {
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw 'Dependencies could not be installed. Check your internet connection and retry.' }
  }
  if (-not (Test-Path -LiteralPath '.next\BUILD_ID')) {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'The application build failed. See the message above.' }
  }
  $dataDirectory = if ($env:FORMA_DATA_DIR) { [System.IO.Path]::GetFullPath($env:FORMA_DATA_DIR) } else { Join-Path $appRoot 'data' }
  New-Item -ItemType Directory -Path $dataDirectory -Force | Out-Null
  $address = 'http://127.0.0.1:3000'
  $health = $null
  try { $health = Invoke-RestMethod -Uri "$address/api/health" -TimeoutSec 2 } catch {}
  if ($health -and ($health.app -ne 'forma-local' -or $health.storagePath -ne $dataDirectory)) { throw 'Port 3000 is being used by a different application or journal copy. Close it first.' }
  if (-not $health) {
    $server = Start-Process -FilePath $nodeCommand -ArgumentList @('node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3000') -WorkingDirectory $appRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $dataDirectory 'server.log') -RedirectStandardError (Join-Path $dataDirectory 'server-error.log') -PassThru
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
      Start-Sleep -Milliseconds 250
      if ($server.HasExited) { throw 'The journal server stopped. Check data\server-error.log for details.' }
      try { $health = Invoke-RestMethod -Uri "$address/api/health" -TimeoutSec 1; break } catch {}
    }
    if (-not $health -or $health.app -ne 'forma-local' -or $health.storagePath -ne $dataDirectory) { throw 'The local journal could not start. Check data\server-error.log.' }
  }
  if (-not $NoBrowser) { Start-Process $address }
} catch {
  Write-Host $_.Exception.Message -ForegroundColor Red
  Read-Host 'Press Enter to close'
  exit 1
}
