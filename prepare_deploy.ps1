# PowerShell Script to Zip and Deploy
$ErrorActionPreference = "Stop"

Write-Host "📦 Zipping project files..." -ForegroundColor Cyan

# Define exclusions
$exclude = @("node_modules", ".git", "*.zip", "*.log", "server.js.bak")

# Get files to zip
$files = Get-ChildItem -Path . -Exclude $exclude

# Create zip
Compress-Archive -Path $files -DestinationPath "deploy_package.zip" -Force

Write-Host "✅ Zip created: deploy_package.zip" -ForegroundColor Green
Write-Host "🚀 Ready to upload!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Run this command to upload:" -ForegroundColor Yellow
Write-Host "scp deploy_package.zip root@api.synthcore.in:/root/" -ForegroundColor White
Write-Host ""
Write-Host "Then SSH into your VPS and run:" -ForegroundColor Yellow
Write-Host "ssh root@api.synthcore.in" -ForegroundColor White
Write-Host "unzip -o deploy_package.zip -d whatsapp-ghl-integration" -ForegroundColor White
Write-Host "cd whatsapp-ghl-integration" -ForegroundColor White
Write-Host "npm install --legacy-peer-deps" -ForegroundColor White
Write-Host "pm2 restart ghl-whatsapp-integration" -ForegroundColor White
