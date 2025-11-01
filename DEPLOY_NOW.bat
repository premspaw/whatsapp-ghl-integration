@echo off
title AI Integration - Deploy to VPS
color 0A

echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║                    🚀 DEPLOY AI INTEGRATION                  ║
echo  ║                                                              ║
echo  ║  This will push your AI fixes to Git for VPS deployment     ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.

REM Quick Git push
echo 📁 Adding files...
git add .

echo 💾 Committing AI integration fixes...
git commit -m "🤖 AI Integration Complete - Fixed recursive calls, added aiService integration, phoneNormalizer fix"

echo 🌐 Pushing to Git...
git push origin main

if %errorlevel% equ 0 (
    echo.
    echo  ╔══════════════════════════════════════════════════════════════╗
    echo  ║                        ✅ SUCCESS!                           ║
    echo  ║                                                              ║
    echo  ║  Code pushed to Git. Now run on your VPS:                   ║
    echo  ║                                                              ║
    echo  ║  ssh your-server                                             ║
    echo  ║  cd /path/to/project                                         ║
    echo  ║  git pull origin main                                        ║
    echo  ║  pm2 restart ghl-whatsapp                                    ║
    echo  ║                                                              ║
    echo  ║  Then test: pm2 logs ghl-whatsapp --lines 20                ║
    echo  ╚══════════════════════════════════════════════════════════════╝
    echo.
    echo 🔗 Your AI integration includes:
    echo    ✅ Fixed recursive call bug
    echo    ✅ Integrated aiService for API calls
    echo    ✅ Fixed phoneNormalizer import
    echo    ✅ Complete WhatsApp to AI response flow
    echo.
) else (
    echo.
    echo  ╔══════════════════════════════════════════════════════════════╗
    echo  ║                        ❌ FAILED                             ║
    echo  ║                                                              ║
    echo  ║  Git push failed. Check your configuration:                  ║
    echo  ║  - Git remote configured?                                    ║
    echo  ║  - Internet connection?                                      ║
    echo  ║  - Authentication setup?                                     ║
    echo  ╚══════════════════════════════════════════════════════════════╝
)

pause