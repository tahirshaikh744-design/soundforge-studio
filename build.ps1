# SoundForge Studio - Automated Windows Build Script
# Developed by Mohd Tahir Shaikh (NEURON TS LABS)
# Email: tahirshaikh744@gmail.com

param (
    [switch]$PortableOnly,
    [switch]$SetupOnly,
    [switch]$SkipTests
)

$ErrorActionPreference = "Stop"
if ($PSScriptRoot) { Set-Location $PSScriptRoot }

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "          SOUNDFORGE STUDIO - AUTOMATED BUILD PIPELINE" -ForegroundColor Green
Write-Host "                 NEURON TS LABS | Mohd Tahir Shaikh" -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Node.js
try {
    $nodeVer = (node -v).Trim()
    Write-Host "[1/4] Found Node.js: $nodeVer" -ForegroundColor Green
} catch {
    Write-Error "Node.js is not found on PATH! Please install Node.js (v18+) from https://nodejs.org"
    exit 1
}

# 2. Check dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "[2/4] Installing dependencies via npm install..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "[2/4] Dependencies verified (node_modules present)." -ForegroundColor Green
}

# 3. Quality Assurance Test Suite
if (-not $SkipTests) {
    Write-Host "[3/4] Running Audio Quality Assurance Test Suite..." -ForegroundColor Yellow
    npm test
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Test suite failed! Aborting build."
        exit 1
    }
} else {
    Write-Host "[3/4] Tests skipped (-SkipTests specified)." -ForegroundColor DarkGray
}

# 4. Target determination
$targetArg = "portable nsis"
if ($PortableOnly) {
    $targetArg = "portable"
    Write-Host "[4/4] Compiling Target: Standalone Portable only..." -ForegroundColor Yellow
} elseif ($SetupOnly) {
    $targetArg = "nsis"
    Write-Host "[4/4] Compiling Target: NSIS Setup Installer only..." -ForegroundColor Yellow
} else {
    Write-Host "[4/4] Compiling Targets: BOTH Standalone Portable & NSIS Setup Installer..." -ForegroundColor Yellow
}

# 5. Run electron-builder
& npx electron-builder --win $targetArg.Split(" ") -p never
if ($LASTEXITCODE -ne 0) {
    Write-Error "electron-builder encountered an error!"
    exit 1
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "                   BUILD COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Generated Executables in dist/:" -ForegroundColor Cyan

Get-ChildItem -Path "dist" -Filter "*.exe" -ErrorAction SilentlyContinue | ForEach-Object {
    $sizeMB = [math]::round($_.Length / 1MB, 2)
    Write-Host "  -> $($_.Name) ($sizeMB MB)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Developer: Mohd Tahir Shaikh <tahirshaikh744@gmail.com>" -ForegroundColor White
Write-Host "Brand: NEURON TS LABS" -ForegroundColor White
Write-Host "GitHub: https://github.com/tahirshaikh744-design" -ForegroundColor Cyan
Write-Host ""
