@echo off
echo ========================================
echo   Clean Server Restart
echo ========================================
echo.
echo Killing any running Node.js processes...
taskkill /F /IM node.exe 2>nul
if %errorlevel% equ 0 (
    echo ✅ Old processes killed
) else (
    echo ℹ️ No old processes found
)
echo.
echo Starting fresh server...
echo.
npm start

