# Deployment Guide: GitHub → Vercel → Subdomain

## Step 1: Create GitHub Repository

1. Go to [GitHub.com](https://github.com)
2. Click "New Repository"
3. Name: `whatsapp-ghl-integration`
4. Make it **Public**
5. **Don't** initialize with README
6. Click "Create Repository"

## Step 2: Push to GitHub

After creating the repository, run these commands:

```bash
git remote add origin https://github.com/YOUR_USERNAME/whatsapp-ghl-integration.git
git branch -M main
git push -u origin main
```

## Step 3: Deploy to Vercel

1. Go to [Vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Other
   - **Root Directory**: `./`
   - **Build Command**: `npm install`
   - **Output Directory**: `./`
   - **Install Command**: `npm install`

## Step 4: Set Environment Variables in Vercel

In Vercel dashboard, go to Settings → Environment Variables:

```
GHL_API_KEY=pit-89789df0-5431-4cc6-9787-8d2423d5d120
GHL_LOCATION_ID=dXh04Cd8ixM9hnk1IS5b
USE_MOCK_WHATSAPP=false
OPENROUTER_API_KEY=your_openrouter_key
```

## Step 5: Configure Subdomain in Vercel

1. In Vercel dashboard, go to your project
2. Go to **Settings** → **Domains**
3. Add domain: `whatsapp.synthcore.in`
4. Configure DNS in your domain provider:
   - Type: CNAME
   - Name: whatsapp
   - Value: cname.vercel-dns.com

## Step 6: Update GHL Custom Field

Change your GHL iframe from:
```html
<iframe src="http://localhost:3000/ghl-whatsapp-tab.html" ...>
```

To:
```html
<iframe src="https://whatsapp.synthcore.in/ghl-whatsapp-tab.html" ...>
```

## Step 7: Test the Integration

1. Visit: `https://whatsapp.synthcore.in/ghl-whatsapp-tab.html`
2. Check if WhatsApp conversations load
3. Test in GHL custom field

## Benefits of This Setup:

✅ **Secure**: No public URLs  
✅ **Professional**: Your own subdomain  
✅ **Scalable**: Vercel handles traffic  
✅ **Reliable**: 99.9% uptime  
✅ **Free**: Vercel free tier  

## Troubleshooting:

- **Black screen**: Check Vercel logs
- **Environment variables**: Make sure they're set in Vercel
- **DNS**: Wait 24-48 hours for DNS propagation
- **SSL**: Vercel provides automatic SSL
