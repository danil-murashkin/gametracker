# Активация ESP-IDF в текущей сессии PowerShell (Windows).
# Использование: . .\activate-idf.ps1

$ErrorActionPreference = "Stop"

$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
            [System.Environment]::GetEnvironmentVariable("Path", "User")

$idfExport = "C:\esp\esp-idf\export.ps1"
if (-not (Test-Path $idfExport)) {
    Write-Error "ESP-IDF not found at C:\esp\esp-idf. Adjust path in activate-idf.ps1"
}

. $idfExport
