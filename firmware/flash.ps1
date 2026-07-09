# Flash firmware to ESP32.
# Usage: .\flash.ps1 [-Port COM8] [-Monitor]

param(
    [string]$Port = "",
    [switch]$Monitor
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

. "$PSScriptRoot\activate-idf.ps1"

if (-not $Port) {
    $ports = [System.IO.Ports.SerialPort]::GetPortNames() | Sort-Object
    if ($ports.Count -eq 0) {
        Write-Error "No COM ports found. Connect ESP32 via USB."
    }
    if ($ports.Count -eq 1) {
        $Port = $ports[0]
        Write-Host "Using port $Port"
    } else {
        Write-Host "Available ports: $($ports -join ', ')"
        $Port = Read-Host "Enter COM port (e.g. COM8)"
    }
}

if (-not (Test-Path build\gametracker.bin)) {
    Write-Host "Binary not found - building first..."
    & "$PSScriptRoot\build.ps1"
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

$idfArgs = @("-p", $Port, "flash")
if ($Monitor) { $idfArgs += "monitor" }

idf.py @idfArgs
