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
echo Preparing release folder (close PayrollAO if it is running)...
call :stop_payrollao
call :clean_release_folder
if errorlevel 1 (
    echo.
    echo ERROR: Could not clear release\win-unpacked — files are locked.
    echo Close ALL PayrollAO windows, then end PayrollAO.exe in Task Manager and run this script again.
    goto :end
)

echo.
echo Building Electron installer...
call npx electron-builder --config electron-builder.json --win
if errorlevel 1 goto :electron_retry

call :install_native_sqlite
if errorlevel 1 goto :native_failed
goto :success_end

:stop_payrollao
echo Stopping PayrollAO processes that lock the build output...
taskkill /F /IM PayrollAO.exe >nul 2>&1
taskkill /F /IM "PayrollAO Setup*.exe" >nul 2>&1
timeout /t 2 /nobreak >nul
exit /b 0

:clean_release_folder
if not exist "release\win-unpacked" exit /b 0
echo Removing old release\win-unpacked...
rmdir /s /q "release\win-unpacked" 2>nul
if exist "release\win-unpacked" (
    ping -n 3 127.0.0.1 >nul
    rmdir /s /q "release\win-unpacked" 2>nul
)
if exist "release\win-unpacked" exit /b 1
exit /b 0

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
echo.
echo Automatic fallback also failed.
echo Please run the app directly with: npx electron .

goto :end

:electron_retry
echo.
echo Primary Electron build failed.
echo Trying fallback build (skip native rebuild)...
echo.
call npx electron-builder --config electron-builder.json --win --config.npmRebuild=false --config.buildDependenciesFromSource=false
if errorlevel 1 goto :electron_failed

call :install_native_sqlite
if errorlevel 1 goto :native_failed
goto :success_end

:install_native_sqlite
echo.
echo Installing better-sqlite3 native module (required for local database)...
call scripts\install-native-sqlite.bat
exit /b %ERRORLEVEL%

:native_failed
echo.
echo ERROR: PayrollAO cannot open the database without better_sqlite3.node.
echo Fix: ensure native-modules\better-sqlite3\Release\better_sqlite3.node exists, then re-run this script.
goto :end

:success_end
echo.
echo ========================================
echo    BUILD COMPLETE!
echo ========================================
echo.
echo Launch: "%CD%\release\win-unpacked\PayrollAO.exe"
echo Installer: "%CD%\release\PayrollAO Setup *.exe"
echo.
if exist "release" (
    dir "release\*.exe" 2>nul
) else (
    echo ERROR: release folder was not created.
)
goto :end

:end
echo.
pause
