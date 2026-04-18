param(
  [ValidateSet("customer", "admin")]
  [string]$Variant = "customer"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$webDir = Join-Path $projectRoot "web"

if (Test-Path $webDir) {
  Remove-Item -Recurse -Force -LiteralPath $webDir
}

New-Item -ItemType Directory -Path $webDir | Out-Null
New-Item -ItemType Directory -Path (Join-Path $webDir "assets") | Out-Null

$entryHtml = if ($Variant -eq "admin") { "index.html" } else { "customer.html" }
$entryScript = if ($Variant -eq "admin") { "app.js" } else { "customer.js" }

$filesToCopy = @(
  $entryHtml,
  "styles.css",
  $entryScript,
  "firebase-config.js",
  "sync-store.js",
  "manifest.json",
  "sw.js"
)

foreach ($file in $filesToCopy) {
  $destinationName = $file
  if ($file -eq $entryHtml) {
    $destinationName = "index.html"
  }

  Copy-Item -LiteralPath (Join-Path $projectRoot $file) -Destination (Join-Path $webDir $destinationName)
}

Copy-Item -LiteralPath (Join-Path $projectRoot "assets\icon.svg") -Destination (Join-Path $webDir "assets\icon.svg")
Copy-Item -LiteralPath (Join-Path $projectRoot "assets\logo.png") -Destination (Join-Path $webDir "assets\logo.png")

Write-Host "Web assets hazirlandi ($Variant): $webDir"
