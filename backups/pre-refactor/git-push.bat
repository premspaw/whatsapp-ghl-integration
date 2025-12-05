@echo off
echo 🚀 Pushing code to Git repository...
echo.

REM Add all changes
echo 📁 Adding all changes...
git add .

REM Check if there are changes to commit
git diff --staged --quiet
if %errorlevel% equ 0 (
    echo ℹ️ No changes to commit
    pause
    exit /b 0
)

REM Commit with timestamp
echo 💾 Committing changes...
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "timestamp=%YYYY%-%MM%-%DD% %HH%:%Min%:%Sec%"

git commit -m "AI Integration fixes and improvements - %timestamp%"

REM Push to origin main
echo 🌐 Pushing to remote repository...
git push origin main

if %errorlevel% equ 0 (
    echo ✅ Successfully pushed to Git!
    echo.
    echo 📋 Next steps:
    echo 1. SSH to your VPS
    echo 2. Run: git pull origin main
    echo 3. Run: pm2 restart ghl-whatsapp
    echo.
) else (
    echo ❌ Failed to push to Git
    echo Please check your Git configuration and try again
)

pause