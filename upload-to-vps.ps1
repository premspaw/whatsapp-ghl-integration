# Upload enhancedAIService.js to VPS
# Replace 'your-vps-ip' with your actual VPS IP address

Write-Host "Uploading enhancedAIService.js to VPS..." -ForegroundColor Green

# Option 1: Using SCP (if available)
Write-Host "Option 1: Using SCP" -ForegroundColor Yellow
Write-Host "scp 'D:\CREATIVE STORIES\New folder\whl to ghl\services\enhancedAIService.js' root@your-vps-ip:~/whatsapp-ghl-integration/services/" -ForegroundColor Cyan

# Option 2: Using PSCP (PuTTY's SCP)
Write-Host "`nOption 2: Using PSCP (if you have PuTTY installed)" -ForegroundColor Yellow
Write-Host "pscp 'D:\CREATIVE STORIES\New folder\whl to ghl\services\enhancedAIService.js' root@your-vps-ip:~/whatsapp-ghl-integration/services/" -ForegroundColor Cyan

# Option 3: Manual copy instructions
Write-Host "`nOption 3: Manual copy (copy the file content and paste on VPS)" -ForegroundColor Yellow
Write-Host "1. Copy the content of enhancedAIService.js" -ForegroundColor Cyan
Write-Host "2. SSH to your VPS" -ForegroundColor Cyan
Write-Host "3. Run: nano ~/whatsapp-ghl-integration/services/enhancedAIService.js" -ForegroundColor Cyan
Write-Host "4. Paste the content and save (Ctrl+X, Y, Enter)" -ForegroundColor Cyan

Write-Host "`nAfter uploading, run these commands on your VPS:" -ForegroundColor Green
Write-Host "pm2 restart ghl-whatsapp" -ForegroundColor Cyan
Write-Host "curl http://localhost:3000/api/whatsapp/status" -ForegroundColor Cyan