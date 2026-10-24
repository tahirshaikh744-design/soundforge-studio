@echo off
setlocal enabledelayedexpansion
title Building SoundForge Studio - NEURON TS LABS

REM Always set current directory to the script's own folder
cd /d "%~dp0"

echo ======================================================================
echo           SOUNDFORGE STUDIO - AUTOMATED BUILD PIPELINE
echo                  NEURON TS LABS ^| Mohd Tahir Shaikh
echo ======================================================================
echo.

REM 1. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js [v18+] from https://nodejs.org
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo [1/4] Found Node.js: %NODE_VER%

REM 2. Check dependencies
if not exist "node_modules\" (
    echo [2/4] Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed!
        pause
        exit /b 1
    )
) else (
    echo [2/4] Dependencies verified [node_modules present].
)

REM 3. Run Quality Assurance Test Suite
echo [3/4] Running Audio Quality Assurance Test Suite...
call npm test
if %errorlevel% neq 0 (
    echo [ERROR] Test suite failed! Aborting build.
    pause
    exit /b 1
)

REM 4. Build Portable & Setup Executables
echo.
echo [4/4] Compiling Windows Portable and NSIS Setup Executables...
echo       Targets: Portable [.exe] + NSIS Installer [.exe]
echo       Arch: x64
echo.

call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] electron-builder failed!
    pause
    exit /b 1
)

echo.
echo ======================================================================
echo                    BUILD COMPLETED SUCCESSFULLY!
echo ======================================================================
echo.
echo Executables generated in dist\:
for %%f in ("dist\SoundForge-Studio-Portable-*.exe") do echo   [x] %%f  [Standalone Portable]
for %%f in ("dist\SoundForge-Studio-Setup-*.exe") do echo   [x] %%f     [NSIS Windows Installer]
echo.
echo Developed by Mohd Tahir Shaikh ^<tahirshaikh744@gmail.com^>
echo Brand: NEURON TS LABS
echo.
pause
