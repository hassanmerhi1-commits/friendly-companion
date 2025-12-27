@echo off
title PayrollAO - Starting...
echo ========================================
echo    PayrollAO - Desktop Application
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    call npm install --save-dev electron electron-builder
)

echo Starting PayrollAO...
echo.

REM Start Vite dev server in background
start /B cmd /c "npm run dev"

REM Wait for Vite to start
echo Waiting for server to start...
timeout /t 5 /nobreak > nul

REM Start Electron
npx electron electron/main.cjs

echo.
echo PayrollAO closed.
pause
