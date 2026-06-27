$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

. "$PSScriptRoot\activate-build.ps1"

if (-not (Test-Path build)) {
    cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
} else {
    cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
}
cmake --build build

Write-Host ""
Write-Host "Run: .\build\simulator.exe"
