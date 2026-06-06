@echo off
cd /d "%~dp0\.."
node scripts\install-native-sqlite.cjs %*
exit /b %ERRORLEVEL%
