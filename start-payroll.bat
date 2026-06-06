@echo off
setlocal
title PayrollAO - Dev (live UI)
cd /d "%~dp0"

echo ========================================
echo    PayrollAO - LIVE DEV MODE
echo ========================================
echo.
echo UI changes apply on save (refresh if needed).
echo Restart this window after electron/main.cjs changes.
echo.

if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

echo Ensuring better-sqlite3 matches Electron...
node scripts\install-native-sqlite.cjs
if errorlevel 1 (
    echo ERROR: SQLite native module install failed.
    pause
    exit /b 1
)

echo Starting Vite on http://localhost:8080 ...
start "PayrollAO-Vite" cmd /c "npm run dev"

echo Waiting for Vite...
set /a tries=0
:wait_vite
timeout /t 1 /nobreak >nul
powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:8080' -TimeoutSec 2).StatusCode | Out-Null; exit 0 } catch { exit 1 }"
if %ERRORLEVEL%==0 goto vite_ready
set /a tries+=1
if %tries% lss 45 goto wait_vite
echo WARNING: Vite slow to start — Electron may need a refresh (F5).

:vite_ready
echo Starting Electron...
set PAYROLLAO_DEV=1
npx electron .

echo.
echo PayrollAO closed.
pause
