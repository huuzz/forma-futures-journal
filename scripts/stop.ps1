$ErrorActionPreference = 'Stop'
$appRoot = Split-Path $PSScriptRoot -Parent
$expectedDirectory = if ($env:FORMA_DATA_DIR) { [System.IO.Path]::GetFullPath($env:FORMA_DATA_DIR) } else { Join-Path $appRoot 'data' }
try {
  $health = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/health' -TimeoutSec 2
  if ($health.app -ne 'forma-local' -or $health.storagePath -ne $expectedDirectory) { throw 'A different application or journal copy is running. It was not stopped.' }
  Stop-Process -Id ([int]$health.processId) -ErrorAction Stop
  Write-Host 'Journal stopped. Your data is saved.'
} catch {
  Write-Host ('Could not stop this journal: ' + $_.Exception.Message)
}
