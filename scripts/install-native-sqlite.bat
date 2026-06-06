@echo off
setlocal
cd /d "%~dp0\.."

set "DST=release\win-unpacked\resources\app\node_modules\better-sqlite3\build"
set "NODE=%DST%\Release\better_sqlite3.node"

if not exist "release\win-unpacked\resources\app\node_modules\better-sqlite3" (
    echo ERROR: Run electron-builder first — release\win-unpacked not found.
    exit /b 1
)

set "SRC="
if exist "native-modules\better-sqlite3\Release\better_sqlite3.node" set "SRC=native-modules\better-sqlite3"
if not defined SRC if exist "release-test\win-unpacked\resources\app\node_modules\better-sqlite3\build\Release\better_sqlite3.node" set "SRC=release-test\win-unpacked\resources\app\node_modules\better-sqlite3\build"
if not defined SRC if exist "C:\Program Files\PayrollAO\resources\app\node_modules\better-sqlite3\build\Release\better_sqlite3.node" set "SRC=C:\Program Files\PayrollAO\resources\app\node_modules\better-sqlite3\build"

if not defined SRC (
    echo ERROR: better_sqlite3.node not found. Copy a working build into native-modules\better-sqlite3\Release\
    exit /b 1
)

if not exist "%DST%" mkdir "%DST%" >nul 2>&1
xcopy /E /I /Y "%SRC%" "%DST%" >nul
if not exist "%NODE%" (
    echo ERROR: Copy failed — %NODE% missing
    exit /b 1
)

echo OK: Installed better_sqlite3.node from %SRC%
exit /b 0
