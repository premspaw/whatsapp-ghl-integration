@echo off
echo Stopping server...
taskkill /F /IM node.exe >nul 2>&1
echo.
echo Waiting 2 seconds...
timeout /t 2 >nul
echo.
echo Starting server...
cd /d "d:\CREATIVE STORIES\New folder\whl to ghl"
start cmd /k npm start
echo.
echo Done! Check the new window for server status.
pause

