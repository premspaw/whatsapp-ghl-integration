@echo off
echo.
echo ========================================
echo   Restarting WhatsApp-GHL Server
echo ========================================
echo.

REM Kill any running node processes
echo Stopping any running servers...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Starting server with fixes...
echo.

REM Navigate to project directory
cd /d "%~dp0"

REM Start the server
npm start

pause

