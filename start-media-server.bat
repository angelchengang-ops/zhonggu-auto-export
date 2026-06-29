@echo off
cd /d "%~dp0"
set PORT=3001
set ZHONGGU_MEDIA_PASSWORD=%ZHONGGU_MEDIA_PASSWORD%
where node >nul 2>nul
if %errorlevel%==0 (
  node server.js
  exit /b %errorlevel%
)
if exist "C:\Program Files\nodejs\node.exe" (
  "C:\Program Files\nodejs\node.exe" server.js
  exit /b %errorlevel%
)
echo Node.js was not found. Install Node.js LTS, then run this file again.
pause
exit /b 1