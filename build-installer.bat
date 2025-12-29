@echo off
title PayrollAO - Building Installer...

REM Change to the directory where the batch file is located
cd /d "%~dp0%"

echo ========================================
echo    PayrollAO - Build Installer
echo ========================================
echo.

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    call npm install --save-dev electron electron-builder
)

echo Building web app...
call npm run build

echo.
echo Building Electron installer...
call npx electron-builder --config electron-builder.json --win

echo.
echo ========================================
echo    BUILD COMPLETE!
echo ========================================
echo.
echo Your installer is in the "release" folder:
echo - PayrollAO Setup X.X.X.exe (installer)
echo - PayrollAO X.X.X.exe (portable)
echo.
echo You can copy the portable .exe to any computer
echo and run it without installing anything!
echo.
pause
