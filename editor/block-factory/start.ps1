$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$localNode = Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) ".tools\node"
if ((Test-Path (Join-Path $localNode "node.exe")) -and -not (Get-Command node -ErrorAction SilentlyContinue)) {
    $env:Path = "$localNode;$env:Path"
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js not found. Install: winget install OpenJS.NodeJS.LTS"
}

if (-not (Test-Path node_modules)) {
    Write-Host "npm install (first run may take a few minutes)..."
    npm install
}

$url = "http://localhost:8082"
Write-Host ""
Write-Host "Blockly Block Factory: $url"
Write-Host "Do not open HTML directly - use the URL above."
Write-Host ""

Start-Process $url
npm start
