# Активация ESP-IDF в текущей сессии PowerShell (Windows).
# Использование: . .\activate-idf.ps1

$ErrorActionPreference = "Stop"

$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
            [System.Environment]::GetEnvironmentVariable("Path", "User")

$candidates = @(
    $(if ($env:IDF_PATH) { Join-Path $env:IDF_PATH "export.ps1" }),
    "C:\esp\esp-idf\export.ps1",
    "C:\Espressif\frameworks\esp-idf-v5.3.2\export.ps1"
) | Where-Object { $_ -and (Test-Path $_) }

$idfExport = $candidates | Select-Object -First 1
if (-not $idfExport) {
    Write-Error @"
ESP-IDF export.ps1 not found.
Install: https://docs.espressif.com/projects/esp-idf/en/latest/esp32/get-started/windows-setup.html
Or run: ..\scripts\setup-esp-idf.ps1
"@
}

. $idfExport
