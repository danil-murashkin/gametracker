param(
    [switch]$GeneratedUI
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

. "$PSScriptRoot\activate-build.ps1"

$cmakeArgs = @("-B", "build", "-G", "Ninja", "-DCMAKE_BUILD_TYPE=Release")
if ($GeneratedUI) {
    $cmakeArgs += "-DSIM_USE_GENERATED_UI=ON"
}

if (-not (Test-Path build)) {
    cmake @cmakeArgs
} else {
    cmake @cmakeArgs
}
cmake --build build

Write-Host ""
Write-Host "Run: .\build\simulator.exe"
