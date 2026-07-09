# Build GameTracker firmware (ESP32, ESP-IDF).
# Usage: .\build.ps1 [-Clean] [-Menuconfig]

param(
    [switch]$Clean,
    [switch]$Menuconfig
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

. "$PSScriptRoot\activate-idf.ps1"

if ($Clean) {
    Write-Host "Cleaning build directory..."
    idf.py fullclean
}

if (-not (Test-Path sdkconfig)) {
    Write-Host "First build: set target esp32"
    idf.py set-target esp32
}

if ($Menuconfig) {
    idf.py menuconfig
    exit $LASTEXITCODE
}

idf.py build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Build OK: build\gametracker.bin"
Write-Host "Flash:  .\flash.ps1 -Port COMx"
Write-Host "Monitor: .\monitor.ps1 -Port COMx"
