# Deploy AI Agent to Synthcore VPS
$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Deployment to api.synthcore.in..." -ForegroundColor Cyan

# 1. Create Zip Archive
Write-Host "📦 Zipping files..." -ForegroundColor Yellow
$zipFile = "whatsapp-ai.zip"
if (Test-Path $zipFile) { Remove-Item $zipFile }

$exclude = @("node_modules", ".git", "*.zip", ".vscode", "tmp", "logs")
Get-ChildItem -Path . -Exclude $exclude | Compress-Archive -DestinationPath $zipFile -Force

# 2. Upload to VPS
Write-Host "Tb Uploading files to VPS (You may be asked for password)..." -ForegroundColor Yellow
scp $zipFile root@api.synthcore.in:/root/
scp .env root@api.synthcore.in:/root/whatsapp-ai.env.temp
scp remote_setup.sh root@api.synthcore.in:/root/

# 3. Execute Remote Script
Write-Host "Tb Executing setup on VPS..." -ForegroundColor Yellow
ssh root@api.synthcore.in "bash /root/remote_setup.sh"

Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "🌍 AI Agent should be running at http://api.synthcore.in:3001"
