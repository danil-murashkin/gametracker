# Активация ESP-IDF в текущей сессии PowerShell (Windows).
# Использование: . .\activate-idf.ps1
#
# Порядок поиска:
#   1. $env:IDF_PATH
#   2. Espressif Installation Manager (C:\esp\vX.Y.Z\esp-idf, tools в C:\Espressif)
#   3. C:\esp\esp-idf и C:\Espressif\frameworks\esp-idf-*

$ErrorActionPreference = "Stop"

$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
            [System.Environment]::GetEnvironmentVariable("Path", "User")

function Get-EimIdfInstalls {
    $jsonCandidates = @(
        $(if ($env:IDF_TOOLS_PATH) { Join-Path $env:IDF_TOOLS_PATH "eim_idf.json" }),
        "C:\Espressif\tools\eim_idf.json",
        (Join-Path $env:USERPROFILE ".espressif\eim_idf.json")
    ) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -Unique

    foreach ($jsonPath in $jsonCandidates) {
        try {
            $cfg = Get-Content -Raw -Path $jsonPath | ConvertFrom-Json
        } catch {
            continue
        }

        $installed = @($cfg.idfInstalled) | Where-Object {
            $_ -and $_.path -and ($_.status -eq "finished" -or -not $_.status)
        }
        if (-not $installed) { continue }

        $selected = $installed | Where-Object { $_.id -eq $cfg.idfSelectedId } | Select-Object -First 1
        if (-not $selected) { $selected = $installed | Select-Object -First 1 }

        return [pscustomobject]@{
            Selected = $selected
            All      = $installed
        }
    }

    return $null
}

function Get-VersionSortKey([string]$Path) {
    if ($Path -match 'v(\d+)\.(\d+)\.(\d+)') {
        return [version]"$($Matches[1]).$($Matches[2]).$($Matches[3])"
    }
    if ($Path -match 'v(\d+)\.(\d+)') {
        return [version]"$($Matches[1]).$($Matches[2]).0"
    }
    return [version]"0.0.0"
}

function Get-IdfExportCandidates {
    $found = New-Object System.Collections.Generic.List[string]

    if (Test-Path "C:\esp") {
        Get-ChildItem "C:\esp" -Directory -ErrorAction SilentlyContinue | ForEach-Object {
            $export = Join-Path $_.FullName "esp-idf\export.ps1"
            if (Test-Path $export) { $found.Add($export) }
        }
    }

    foreach ($fixed in @(
        "C:\esp\esp-idf\export.ps1",
        "C:\Espressif\frameworks\esp-idf-v5.3.2\export.ps1"
    )) {
        if ((Test-Path $fixed) -and -not $found.Contains($fixed)) {
            $found.Add($fixed)
        }
    }

    if (Test-Path "C:\Espressif\frameworks") {
        Get-ChildItem "C:\Espressif\frameworks" -Directory -Filter "esp-idf-*" -ErrorAction SilentlyContinue | ForEach-Object {
            $export = Join-Path $_.FullName "export.ps1"
            if ((Test-Path $export) -and -not $found.Contains($export)) {
                $found.Add($export)
            }
        }
    }

    return @($found | Sort-Object { Get-VersionSortKey $_ } -Descending)
}

function Get-EimActivationForPath([string]$IdfPath, $Eim) {
    if (-not $Eim -or -not $IdfPath) { return $null }
    $match = @($Eim.All) | Where-Object {
        $_.path -and ($_.path.TrimEnd('\') -eq $IdfPath.TrimEnd('\'))
    } | Select-Object -First 1
    if ($match -and $match.activationScript -and (Test-Path $match.activationScript)) {
        return $match.activationScript
    }
    return $null
}

$eim = Get-EimIdfInstalls
$eimScript = $null
$idfExport = $null

if ($env:IDF_PATH) {
    $eimScript = Get-EimActivationForPath $env:IDF_PATH $eim
    if (-not $eimScript) {
        $explicitExport = Join-Path $env:IDF_PATH "export.ps1"
        if (Test-Path $explicitExport) { $idfExport = $explicitExport }
    }
}

if (-not $eimScript -and -not $idfExport -and $eim) {
    $selectedPath = $eim.Selected.path
    if ($selectedPath -and (Test-Path $selectedPath)) {
        $eimScript = Get-EimActivationForPath $selectedPath $eim
    }
}

if (-not $eimScript -and -not $idfExport) {
    $idfExport = Get-IdfExportCandidates | Select-Object -First 1
    if ($idfExport) {
        $matched = Get-EimActivationForPath (Split-Path $idfExport -Parent) $eim
        if ($matched) {
            $eimScript = $matched
            $idfExport = $null
        }
    }
}

if ($eimScript) {
    . $eimScript
} elseif ($idfExport) {
    . $idfExport
} else {
    Write-Error @"
ESP-IDF not found.
Looked for an Espressif Installation Manager install (C:\esp\v*\esp-idf) and for:
  C:\esp\esp-idf\export.ps1
  C:\Espressif\frameworks\esp-idf-*\export.ps1
Install: https://docs.espressif.com/projects/esp-idf/en/latest/esp32/get-started/windows-setup.html
Or run: ..\scripts\setup-esp-idf.ps1
"@
}
