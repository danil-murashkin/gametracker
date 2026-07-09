# Install Emscripten SDK for editor LVGL Preview (browser compile).
# Run: .\scripts\setup-emsdk.ps1

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path $PSScriptRoot -Parent
$EmsdkRoot = if ($env:EMSDK) { $env:EMSDK } else { Join-Path $RepoRoot ".tools\emsdk" }

Write-Host "=== Emscripten SDK (LVGL Preview in editor) ==="
Write-Host "Target: $EmsdkRoot"
Write-Host ""

if (-not (Test-Path $EmsdkRoot)) {
    Write-Host "Cloning emsdk..."
    git clone https://github.com/emscripten-core/emsdk.git $EmsdkRoot
}

Push-Location $EmsdkRoot
try {
    Write-Host "Installing latest (may take several minutes)..."
    .\emsdk install latest
    .\emsdk activate latest

    Write-Host ""
    Write-Host "Add to user PATH (run once as admin or in PowerShell):"
    Write-Host "  $EmsdkRoot\upstream\emscripten"
    Write-Host ""
    Write-Host "Or before starting editor:"
    Write-Host "  . $EmsdkRoot\emsdk_env.ps1"
    Write-Host ""

    . .\emsdk_env.ps1
    emcc --version
    Write-Host ""
    Write-Host "Emscripten OK. Restart editor dev server: cd editor; .\lvgl-editor-start.ps1"
} finally {
    Pop-Location
}
