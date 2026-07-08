$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$port = 8083

$localNode = Join-Path (Split-Path $PSScriptRoot -Parent) ".tools\node"
if ((Test-Path (Join-Path $localNode "node.exe")) -and -not (Get-Command node -ErrorAction SilentlyContinue)) {
    $env:Path = "$localNode;$env:Path"
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js not found. Install: winget install OpenJS.NodeJS.LTS"
}

if (-not (Test-Path (Join-Path $PSScriptRoot "package.json"))) {
    Write-Error "editor/package.json is missing. Restore from git or see editor/README.md."
}

if (-not (Test-Path node_modules)) {
    Write-Host "npm install (first run may take a minute)..."
    npm install
}

$url = "http://localhost:$port"
Write-Host ""
Write-Host "LVGL UI Editor (GameTracker fork, English UI): $url"
Write-Host "Export .c/.h from the editor UI -> common/ui/"
Write-Host ""

# Enable "Preview → Compile & Run" (WASM LVGL + logic).
$env:VITE_ENABLE_COMPILE_PREVIEW = "true"
Start-Process $url
npm run dev -- --port $port --strictPort
