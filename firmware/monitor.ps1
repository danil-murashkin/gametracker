# Serial monitor (115200 baud, ESP-IDF).
# Usage: .\monitor.ps1 [-Port COM8]

param(
    [string]$Port = ""
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

. "$PSScriptRoot\activate-idf.ps1"

if (-not $Port) {
    $ports = [System.IO.Ports.SerialPort]::GetPortNames() | Sort-Object
    if ($ports.Count -eq 0) {
        Write-Error "No COM ports found."
    }
    $Port = if ($ports.Count -eq 1) { $ports[0] } else { $ports[0] }
    Write-Host "Using port $Port (Ctrl+] to exit monitor)"
}

idf.py -p $Port monitor
