#!/usr/bin/env pwsh

# Git Push Script with AI Integration Updates
Write-Host "🚀 Pushing AI Integration fixes to Git..." -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Check if we're in a git repository
if (-not (Test-Path ".git")) {
    Write-Host "❌ Not a Git repository. Please initialize Git first." -ForegroundColor Red
    Write-Host "Run: git init && git remote add origin <your-repo-url>" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Add all changes
Write-Host "📁 Adding all changes..." -ForegroundColor Green
git add .

# Check if there are changes to commit
$changes = git diff --staged --name-only
if (-not $changes) {
    Write-Host "ℹ️ No changes to commit" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 0
}

Write-Host "📝 Files to be committed:" -ForegroundColor Blue
$changes | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }

# Get current timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Commit with descriptive message
Write-Host "💾 Committing changes..." -ForegroundColor Green
$commitMessage = "AI Integration fixes and improvements - $timestamp

✅ Fixed recursive call bug in enhancedAIService
✅ Integrated aiService for actual API calls  
✅ Fixed phoneNormalizer import error
✅ Verified complete WhatsApp to AI response flow
✅ AI responses now generating successfully"

git commit -m $commitMessage

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Changes committed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to commit changes" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Push to remote repository
Write-Host "🌐 Pushing to remote repository..." -ForegroundColor Green
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Successfully pushed to Git!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next steps for VPS deployment:" -ForegroundColor Cyan
    Write-Host "1. SSH to your VPS server" -ForegroundColor White
    Write-Host "2. Navigate to project directory" -ForegroundColor White
    Write-Host "3. Run: ./vps-deploy.sh" -ForegroundColor Yellow
    Write-Host "   OR manually:" -ForegroundColor White
    Write-Host "   git pull origin main" -ForegroundColor Yellow
    Write-Host "   npm install" -ForegroundColor Yellow
    Write-Host "   pm2 restart ghl-whatsapp" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "🔍 After deployment, test with:" -ForegroundColor Cyan
    Write-Host "   pm2 logs ghl-whatsapp --lines 20" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "❌ Failed to push to Git" -ForegroundColor Red
    Write-Host "Please check your Git configuration and network connection" -ForegroundColor Yellow
    
    # Show git status for debugging
    Write-Host ""
    Write-Host "🔍 Git status:" -ForegroundColor Blue
    git status
}

Read-Host "Press Enter to exit"