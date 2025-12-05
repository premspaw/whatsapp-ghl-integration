@echo off
echo ============================================
echo   RESTARTING SERVER
echo ============================================
echo.

REM Kill any running Node.js processes
taskkill /F /IM node.exe >nul 2>&1

echo [1/2] Stopped old server...
timeout /t 2 /nobreak >nul

echo [2/2] Starting new server...
echo.
echo ============================================
echo   SERVER STARTING...
echo ============================================
echo.

start npm start

echo.
echo ✅ Server is starting!
echo 🌐 Open: http://localhost:3000
echo.
pause

