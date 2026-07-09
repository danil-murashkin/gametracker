# Verify or install ESP-IDF on Windows (GameTracker).
# Run from repo root: .\scripts\setup-esp-idf.ps1

$ErrorActionPreference = "Stop"

$IdfPath = if ($env:IDF_PATH) { $env:IDF_PATH } else { "C:\esp\esp-idf" }
$ExportPs1 = Join-Path $IdfPath "export.ps1"

function Test-IdfReady {
    if (-not (Test-Path $ExportPs1)) { return $false }
    try {
        . $ExportPs1
        $v = idf.py --version 2>&1
        Write-Host "ESP-IDF OK: $v"
        return $true
    } catch {
        return $false
    }
}

Write-Host "=== GameTracker ESP-IDF setup ==="
Write-Host "Expected path: $IdfPath"
Write-Host ""

if (Test-IdfReady) {
    Write-Host "ESP-IDF is ready. Build firmware:"
    Write-Host "  cd firmware"
    Write-Host "  .\build.ps1"
    exit 0
}

Write-Host "ESP-IDF not found or not configured."
Write-Host ""
Write-Host "Option A — Official installer (recommended):"
Write-Host "  https://docs.espressif.com/projects/esp-idf/en/latest/esp32/get-started/windows-setup.html"
Write-Host "  Install to C:\esp\esp-idf"
Write-Host ""
Write-Host "Option B — Manual clone:"
Write-Host @"

  mkdir C:\esp -Force
  git clone -b v5.3.2 --recursive https://github.com/espressif/esp-idf.git C:\esp\esp-idf
  cd C:\esp\esp-idf
  .\install.ps1 esp32
  .\export.ps1

"@
Write-Host "Then verify:"
Write-Host "  cd firmware"
Write-Host "  . .\activate-idf.ps1"
Write-Host "  idf.py --version"
exit 1
