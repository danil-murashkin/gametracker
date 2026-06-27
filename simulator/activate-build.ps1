# MinGW + CMake + Ninja в текущей сессии PowerShell (Windows).
# Использование: . .\activate-build.ps1

$ErrorActionPreference = "Stop"

$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
            [System.Environment]::GetEnvironmentVariable("Path", "User")

function Find-MingwBin {
    $candidates = @(
        "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.MSVCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin",
        "C:\mingw64\bin",
        "C:\msys64\mingw64\bin"
    )
    foreach ($dir in $candidates) {
        if (Test-Path (Join-Path $dir "cmake.exe")) {
            return $dir
        }
    }
    $winget = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Filter "BrechtSanders.WinLibs*" -Directory -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($winget) {
        $dir = Join-Path $winget.FullName "mingw64\bin"
        if (Test-Path (Join-Path $dir "cmake.exe")) {
            return $dir
        }
    }
    return $null
}

if (-not (Get-Command cmake -ErrorAction SilentlyContinue)) {
    $mingwBin = Find-MingwBin
    if ($null -eq $mingwBin) {
        Write-Error @"
cmake not found. Install MinGW-w64 with CMake/Ninja, for example:
  winget install BrechtSanders.WinLibs.POSIX.MSVCRT
Then open a new terminal and run: . .\activate-build.ps1
"@
    }
    $env:Path = "$mingwBin;$env:Path"
    Write-Host "Added to PATH: $mingwBin"
}

foreach ($tool in @("cmake", "ninja", "gcc")) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        Write-Error "$tool not found after PATH setup"
    }
}

Write-Host "Build tools: cmake $((cmake --version | Select-Object -First 1)), gcc $((gcc -dumpversion))"
