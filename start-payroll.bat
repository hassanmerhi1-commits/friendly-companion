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

if not exist "node_modules\better-sqlite3\build\Release\better_sqlite3.node" (
    if exist "native-modules\better-sqlite3\Release\better_sqlite3.node" (
        echo Copying SQLite native module for dev...
        if not exist "node_modules\better-sqlite3\build\Release" mkdir "node_modules\better-sqlite3\build\Release"
        copy /Y "native-modules\better-sqlite3\Release\better_sqlite3.node" "node_modules\better-sqlite3\build\Release\better_sqlite3.node" >nul
    )
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
