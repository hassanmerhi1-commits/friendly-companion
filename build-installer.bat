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
if errorlevel 1 goto :electron_retry

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

echo.
echo Fallback build succeeded. Attempting native module copy for better-sqlite3...
set "SRC1=C:\Program Files\PayrollAO\resources\app\node_modules\better-sqlite3\build"
set "SRC2=C:\Program Files\vite_react_shadcn_ts\resources\app\node_modules\better-sqlite3\build"
set "SRC3=%CD%\release-test\win-unpacked\resources\app\node_modules\better-sqlite3\build"
set "DST=release\win-unpacked\resources\app\node_modules\better-sqlite3\build"

if exist "%SRC1%\Release\better_sqlite3.node" (
    call :copy_native "%SRC1%"
    goto :after_native_copy
)

if exist "%SRC2%\Release\better_sqlite3.node" (
    call :copy_native "%SRC2%"
    goto :after_native_copy
)

if exist "%SRC3%\Release\better_sqlite3.node" (
    call :copy_native "%SRC3%"
    goto :after_native_copy
)

echo WARNING: Could not find a prebuilt better-sqlite3 binary in Program Files.
echo You can still test with: npx electron .
goto :after_native_copy

:copy_native
set "SRC=%~1"
if not exist "release\win-unpacked\resources\app\node_modules\better-sqlite3" (
    mkdir "release\win-unpacked\resources\app\node_modules\better-sqlite3" >nul 2>&1
)
if not exist "%DST%" (
    mkdir "%DST%" >nul 2>&1
)
xcopy /E /I /Y "%SRC%" "%DST%" >nul
if exist "%DST%\Release\better_sqlite3.node" (
    echo Native binary copied from:
    echo "%SRC%"
) else (
    echo WARNING: Copy command ran, but better_sqlite3.node was not found in destination.
)
exit /b 0

:after_native_copy
echo.
echo Fallback packaging finished.
echo For this build, launch:
echo "%CD%\release\win-unpacked\PayrollAO.exe"
goto :success_end

:success_end
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

:end
echo.
pause
