$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host "Aktaş Kuyumculuk canlı fiyat servisi başlatılıyor..."
Write-Host "Proje: $projectRoot"

npm run rates:watch
