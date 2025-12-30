@echo off
setlocal enableextensions enabledelayedexpansion

title PayrollAO - Building Installer...

REM Always run from the folder where this .bat file lives
REM Use quotes to handle paths with spaces and special characters
cd /d "%~dp0"

echo ========================================
echo    PayrollAO - Build Installer
echo ========================================
echo.
echo Working directory: "%CD%"
echo.

if not exist "package.json" (
    echo ERROR: package.json not found in "%CD%"
    echo Make sure you are running this .bat from the project root.
    goto :end
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 goto :npm_failed

    call npm install --save-dev electron electron-builder
    if errorlevel 1 goto :npm_failed
)

echo Building web app...
call npm run build
if errorlevel 1 goto :build_failed

if not exist "dist\index.html" (
    echo ERROR: Build finished but dist\index.html was not found.
    echo Something prevented the Vite build from outputting files.
    goto :end
)

echo.
echo Building Electron installer...
call npx electron-builder --config electron-builder.json --win
if errorlevel 1 goto :electron_failed

echo.
echo ========================================
echo    BUILD COMPLETE!
echo ========================================
echo.
echo Your output should be in: "%CD%\release"
if exist "release" (
    echo.
    echo Contents of release folder:
    dir "release"
) else (
    echo.
    echo ERROR: release folder was not created.
)

goto :end

:npm_failed
echo.
echo ERROR: npm install failed.

goto :end

:build_failed
echo.
echo ERROR: npm run build failed.

goto :end

:electron_failed
echo.
echo ERROR: electron-builder failed.

goto :end

:end
echo.
pause
