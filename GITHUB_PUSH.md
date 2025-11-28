# 📤 Push to GitHub Instructions

## Step 1: Create GitHub Repository

1. Go to: https://github.com/new
2. Repository name: `whatsapp-ai-agent` (or your preferred name)
3. Description: `WhatsApp AI Agent with Grok, Pinecone, and GHL integration`
4. **Private** (recommended for API keys security)
5. **DO NOT** initialize with README (we already have one)
6. Click "Create repository"

## Step 2: Push Local Code to GitHub

After creating the repository, run these commands:

```powershell
# Add GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/whatsapp-ai-agent.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Alternative: Using SSH (if you have SSH keys set up)

```powershell
git remote add origin git@github.com:YOUR_USERNAME/whatsapp-ai-agent.git
git branch -M main
git push -u origin main
```

## Step 3: Verify

1. Go to your GitHub repository URL
2. You should see all files (except `.env` which is gitignored)
3. README.md should display nicely

## 🔐 Security Check

Before pushing, verify `.env` is NOT included:

```powershell
git status
```

You should see `.env` listed under "Untracked files" or not listed at all (because of `.gitignore`).

**NEVER commit `.env` file!** It contains sensitive API keys.

## 📝 Future Updates

When you make changes:

```powershell
# Stage changes
git add .

# Commit with message
git commit -m "Your commit message here"

# Push to GitHub
git push
```

## 🌿 Branching (Optional)

For feature development:

```powershell
# Create and switch to new branch
git checkout -b feature/new-feature

# Make changes, commit
git add .
git commit -m "Add new feature"

# Push branch
git push -u origin feature/new-feature

# Create Pull Request on GitHub
# After merge, switch back to main
git checkout main
git pull
```

## ✅ Done!

Your code is now on GitHub and ready to:
- Clone to VPS
- Share with team
- Track changes
- Collaborate

---

**Next:** See `DEPLOYMENT_SYNTHCORE.md` for deploying from GitHub to VPS
