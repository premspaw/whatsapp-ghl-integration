# Deployment Instructions for VPS

## Quick Start

1. Upload these files to your VPS
2. Run the deploy script
3. Configure Nginx
4. Done!

## Environment Setup

Create this file on VPS at `loyalty-app/.env.local`:

```
NEXT_PUBLIC_API_URL=https://api.synthcore.in
```

## PM2 Commands

```bash
# Start loyalty frontend only
pm2 start ecosystem.config.js --only loyalty-frontend

# View logs
pm2 logs loyalty-frontend

# Restart if needed
pm2 restart loyalty-frontend

# Stop
pm2 stop loyalty-frontend
```

## Nginx Configuration

Add to your existing Nginx config:

```nginx
server {
    listen 80;
    server_name loyalty.synthcore.in;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then run:
```bash
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d loyalty.synthcore.in
```
