# Workaround for Gradle 8.6–8.14 Windows bug:
# "Could not move temporary workspace ... to immutable location"
# https://github.com/gradle/gradle/issues/31438

$ErrorActionPreference = "Continue"
$GradleHome = "C:\gradle-cache"
$ProjectAndroid = Join-Path $PSScriptRoot "..\android" | Resolve-Path
$env:GRADLE_USER_HOME = $GradleHome

function Heal-GradleWorkspaces {
  $base = Join-Path $GradleHome "caches\8.14.3"
  if (-not (Test-Path $base)) { return }
  $roots = Get-ChildItem $base -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^(kotlin-dsl|groovy-dsl|transforms)$' } |
    ForEach-Object { $_.FullName }
  foreach ($root in $roots) {
    Get-ChildItem $root -Recurse -Directory -ErrorAction SilentlyContinue | Where-Object {
      $_.Name -match '^[a-f0-9]+-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
    } | ForEach-Object {
      $temp = $_.FullName
      $immutable = Join-Path $_.Parent.FullName (
        $_.Name -replace '-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$', ''
      )
      try {
        if (Test-Path $immutable) {
          Remove-Item -Recurse -Force $temp -ErrorAction Stop
        } else {
          # Prefer robocopy+remove if Move-Item denied
          try {
            Move-Item -Force $temp $immutable -ErrorAction Stop
          } catch {
            New-Item -ItemType Directory -Force -Path $immutable | Out-Null
            & robocopy $temp $immutable /E /MOVE /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
            if (Test-Path $temp) { Remove-Item -Recurse -Force $temp -ErrorAction SilentlyContinue }
          }
        }
      } catch {
        Remove-Item -Recurse -Force $temp -ErrorAction SilentlyContinue
      }
    }
  }
}

# Continuous healer (Gradle holds locks briefly; healing between failures is main path)
$healer = Start-Job -ScriptBlock {
  param($home)
  while ($true) {
    $base = Join-Path $home "caches\8.14.3"
    if (Test-Path $base) {
      Get-ChildItem $base -Directory -EA SilentlyContinue |
        Where-Object { $_.Name -match '^(kotlin-dsl|groovy-dsl|transforms)$' } |
        ForEach-Object {
          Get-ChildItem $_.FullName -Recurse -Directory -EA SilentlyContinue | Where-Object {
            $_.Name -match '^[a-f0-9]+-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
          } | ForEach-Object {
            $temp = $_.FullName
            $immutable = Join-Path $_.Parent.FullName (
              $_.Name -replace '-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$', ''
            )
            try {
              if (Test-Path $immutable) { Remove-Item -Recurse -Force $temp -EA Stop }
              else { Move-Item -Force $temp $immutable -EA Stop }
            } catch {}
          }
        }
    }
    Start-Sleep -Milliseconds 150
  }
} -ArgumentList $GradleHome

Push-Location $ProjectAndroid
try {
  $max = if ($env:GRADLE_HEAL_MAX) { [int]$env:GRADLE_HEAL_MAX } else { 40 }
  for ($i = 1; $i -le $max; $i++) {
    Write-Host "`n===== ATTEMPT $i/$max =====" -ForegroundColor Cyan
    Heal-GradleWorkspaces
    & .\gradlew.bat app:assembleDebug -x lint -x test --no-daemon --no-build-cache `
      -PreactNativeArchitectures=arm64-v8a
    if ($LASTEXITCODE -eq 0) {
      Write-Host "BUILD_SUCCESS" -ForegroundColor Green
      exit 0
    }
    Write-Host "failed ($LASTEXITCODE) - healing cache and retrying..." -ForegroundColor Yellow
    Heal-GradleWorkspaces
    Start-Sleep -Seconds 1
  }
  Write-Host "BUILD_FAILED after $max attempts" -ForegroundColor Red
  exit 1
} finally {
  Stop-Job $healer -ErrorAction SilentlyContinue
  Remove-Job $healer -Force -ErrorAction SilentlyContinue
  Pop-Location
}
