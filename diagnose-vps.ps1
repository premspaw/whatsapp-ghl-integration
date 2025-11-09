# VPS Server Diagnostics Script
Write-Host "=== VPS Server Diagnostics ===" -ForegroundColor Green

# Test SSH connection and run diagnostics
$commands = @(
    "pm2 status",
    "pm2 logs ghl-whatsapp --lines 5",
    "netstat -tlnp | grep :3000",
    "curl -sS http://localhost:3000/api/health || echo 'Local health check failed'",
    "ps aux | grep node",
    "cat /etc/nginx/sites-available/api.synthcore.in | grep proxy_pass"
)

foreach ($cmd in $commands) {
    Write-Host "`n--- Running: $cmd ---" -ForegroundColor Yellow
    ssh root@srv1078976.hosting-data.io $cmd
    Write-Host ""
}

Write-Host "=== Diagnostics Complete ===" -ForegroundColor Green