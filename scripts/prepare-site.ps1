param(
  [string]$OutputDir = "site-dist"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$siteDir = Join-Path $projectRoot $OutputDir

if (Test-Path $siteDir) {
  Remove-Item -Recurse -Force -LiteralPath $siteDir
}

New-Item -ItemType Directory -Path $siteDir | Out-Null
New-Item -ItemType Directory -Path (Join-Path $siteDir "assets") | Out-Null

$filesToCopy = @(
  "site.css",
  "site.js",
  "firebase-config.js",
  "sync-store.js"
)

foreach ($file in $filesToCopy) {
  Copy-Item -LiteralPath (Join-Path $projectRoot $file) -Destination (Join-Path $siteDir $file)
}

Copy-Item -LiteralPath (Join-Path $projectRoot "site.html") -Destination (Join-Path $siteDir "index.html")
Copy-Item -LiteralPath (Join-Path $projectRoot "assets\logo.png") -Destination (Join-Path $siteDir "assets\logo.png")
Copy-Item -LiteralPath (Join-Path $projectRoot "assets\logo-transparent.png") -Destination (Join-Path $siteDir "assets\logo-transparent.png")

Write-Host "Site deploy paketi hazirlandi: $siteDir"
