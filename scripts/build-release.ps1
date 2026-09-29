param(
  [string]$Version = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$ChromeManifest = Get-Content ".\manifest.json" -Raw | ConvertFrom-Json
if ([string]::IsNullOrWhiteSpace($Version)) {
  $Version = $ChromeManifest.version
}

$FirefoxManifest = Get-Content ".\manifest.firefox.json" -Raw | ConvertFrom-Json
if ($ChromeManifest.version -ne $Version -or $FirefoxManifest.version -ne $Version) {
  throw "As versoes dos manifests precisam ser iguais a $Version."
}

$Dist = Join-Path $Root "dist"
$ChromeDir = Join-Path $Dist "chrome-edge"
$FirefoxDir = Join-Path $Dist "firefox"

Remove-Item $Dist -Recurse -Force -ErrorAction SilentlyContinue
New-Item $ChromeDir -ItemType Directory -Force | Out-Null
New-Item $FirefoxDir -ItemType Directory -Force | Out-Null

$Files = @(
  "AGENTS.md","CHANGELOG.md","MANUAL_USUARIO.md","PRIVACIDADE.md","README.md",
  "background.js","content-ui.css","content-ui.js","content-whatsapp.js",
  "options.html","options.js","pending.html","pending.js","popup.html","popup.js","ui.css"
)

foreach ($file in $Files) {
  Copy-Item (Join-Path $Root $file) (Join-Path $ChromeDir $file)
  Copy-Item (Join-Path $Root $file) (Join-Path $FirefoxDir $file)
}

Copy-Item (Join-Path $Root "icons") (Join-Path $ChromeDir "icons") -Recurse
Copy-Item (Join-Path $Root "icons") (Join-Path $FirefoxDir "icons") -Recurse

Copy-Item (Join-Path $Root "manifest.json") (Join-Path $ChromeDir "manifest.json")
Copy-Item (Join-Path $Root "manifest.firefox.json") (Join-Path $FirefoxDir "manifest.json")

$JsFiles = @("background.js","content-ui.js","content-whatsapp.js","options.js","pending.js","popup.js")
foreach ($js in $JsFiles) {
  node --check (Join-Path $ChromeDir $js)
  if ($LASTEXITCODE -ne 0) { throw "Falha de sintaxe em $js" }
}

Get-Content (Join-Path $ChromeDir "manifest.json") -Raw | ConvertFrom-Json | Out-Null
Get-Content (Join-Path $FirefoxDir "manifest.json") -Raw | ConvertFrom-Json | Out-Null

$ChromeZip = Join-Path $Dist "whatsapp-alerta-central-chrome-edge-v$Version.zip"
$FirefoxZip = Join-Path $Dist "whatsapp-alerta-central-firefox-v$Version.zip"
Compress-Archive -Path "$ChromeDir\*" -DestinationPath $ChromeZip -Force
Compress-Archive -Path "$FirefoxDir\*" -DestinationPath $FirefoxZip -Force

Write-Host ""
Write-Host "Pacotes gerados:"
Write-Host " - $ChromeZip"
Write-Host " - $FirefoxZip"
