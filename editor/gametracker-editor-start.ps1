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
Write-Host "GameTracker Editor: $url"
Write-Host "Export .c/.h from the editor UI -> common/ui_generated/"
Write-Host ""

# Enable compile API for Preview / Simulator (requires Emscripten SDK in PATH).
$env:VITE_ENABLE_COMPILE_PREVIEW = "true"

# Emscripten for Simulator - auto-detect workspace .tools/emsdk or C:\emsdk
$emsdkCandidates = @(
    $(if ($env:EMSDK) { Join-Path $env:EMSDK "emsdk_env.ps1" }),
    (Join-Path (Split-Path $PSScriptRoot -Parent) ".tools\emsdk\emsdk_env.ps1"),
    "C:\emsdk\emsdk_env.ps1"
)
$emsdkLoaded = $false
foreach ($emsdkEnv in $emsdkCandidates) {
    if ($emsdkEnv -and (Test-Path $emsdkEnv)) {
        . $emsdkEnv
        $emsdkLoaded = $true
        break
    }
}
if ($emsdkLoaded) {
    Write-Host "Emscripten: $(emcc --version 2>&1 | Select-Object -First 1)"
} else {
    Write-Host "WARN: Emscripten not found - Simulator compile will fail."
    Write-Host "      Run: ..\scripts\setup-emsdk.ps1"
}
Start-Process $url
npm run dev -- --port $port --strictPort
