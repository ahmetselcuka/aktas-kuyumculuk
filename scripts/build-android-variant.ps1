param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("customer", "admin")]
  [string]$Variant
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$androidRoot = Join-Path $projectRoot "android"
$stringsPath = Join-Path $androidRoot "app\src\main\res\values\strings.xml"
$buildGradlePath = Join-Path $androidRoot "app\build.gradle"
$apkOutputDir = Join-Path $projectRoot "dist"

$config = if ($Variant -eq "admin") {
  @{
    AppId = "com.aktas.kuyumculuk.yonetim"
    AppName = "Akta&#351; Kuyumculuk Y&#246;netim"
    ApkName = "aktas-yonetim.apk"
  }
} else {
  @{
    AppId = "com.aktas.kuyumculuk.musteri"
    AppName = "Akta&#351; Kuyumculuk M&#252;&#351;teri"
    ApkName = "aktas-musteri.apk"
  }
}

if (-not (Test-Path $apkOutputDir)) {
  New-Item -ItemType Directory -Path $apkOutputDir | Out-Null
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$stringsContent = @"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">$($config.AppName)</string>
    <string name="title_activity_main">$($config.AppName)</string>
    <string name="package_name">$($config.AppId)</string>
    <string name="custom_url_scheme">$($config.AppId)</string>
</resources>
"@

$buildGradle = Get-Content -Raw -Path $buildGradlePath
$buildGradle = [regex]::Replace($buildGradle, 'applicationId "[^"]+"', "applicationId `"$($config.AppId)`"")

[System.IO.File]::WriteAllText($stringsPath, $stringsContent, $utf8NoBom)
[System.IO.File]::WriteAllText($buildGradlePath, $buildGradle, $utf8NoBom)

& powershell -ExecutionPolicy Bypass -File (Join-Path $projectRoot "scripts\prepare-web.ps1") -Variant $Variant
Push-Location $projectRoot
try {
  npx cap sync android
} finally {
  Pop-Location
}

Push-Location $androidRoot
try {
  $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
  $env:Path = "$env:JAVA_HOME\bin;$env:Path"
  & .\gradlew.bat assembleDebug
} finally {
  Pop-Location
}

$sourceApk = Join-Path $androidRoot "app\build\outputs\apk\debug\app-debug.apk"
$targetApk = Join-Path $apkOutputDir $config.ApkName
Copy-Item -LiteralPath $sourceApk -Destination $targetApk -Force

Write-Host "Hazir APK: $targetApk"
