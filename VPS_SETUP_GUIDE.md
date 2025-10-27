# VPS Setup Guide for WhatsApp + GHL Integration

## Step 1: Initial VPS Configuration

### After VPS Creation:
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git nano htop unzip
```

## Step 2: Install Node.js (Latest LTS)

```bash
# Install Node.js 18.x (recommended for WhatsApp Web.js)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

## Step 3: Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version
```

## Step 4: Install Additional Dependencies

```bash
# Install build tools (for native modules)
sudo apt install -y build-essential

# Install Python (for some Node.js modules)
sudo apt install -y python3 python3-pip

# Install Git (if not already installed)
sudo apt install -y git
```

## Step 5: Configure Firewall

```bash
# Install UFW (Uncomplicated Firewall)
sudo apt install -y ufw

# Allow SSH
sudo ufw allow ssh

# Allow HTTP
sudo ufw allow 80

# Allow HTTPS
sudo ufw allow 443

# Allow your application port (default 3000)
sudo ufw allow 3000

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## Step 6: Create Application User (Recommended)

```bash
# Create a new user for your application
sudo adduser whatsapp-app

# Add user to sudo group
sudo usermod -aG sudo whatsapp-app

# Switch to the new user
su - whatsapp-app
```

## Step 7: Deploy Your Application

```bash
# Clone your repository
git clone https://github.com/your-username/whatsapp-ghl-integration.git
cd whatsapp-ghl-integration

# Install dependencies
npm install

# Create environment file
nano .env
```

## Step 8: Environment Configuration

```bash
# .env file content
NODE_ENV=production
PORT=3000

# WhatsApp Configuration
WHATSAPP_SESSION_PATH=./sessions
WHATSAPP_QR_CODE_PATH=./public/qr-code.png

# GHL Integration
GHL_API_KEY=your_ghl_api_key
GHL_LOCATION_ID=your_location_id

# Database (Supabase)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Server Configuration
SERVER_URL=https://your-domain.com
```

## Step 9: Start Application with PM2

```bash
# Start your application
pm2 start server.js --name whatsapp-app

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup

# Check status
pm2 status
pm2 logs whatsapp-app
```

## Step 10: Configure Nginx (Optional but Recommended)

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/whatsapp-app
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/whatsapp-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 11: SSL Certificate (Optional)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

## Step 12: Test Your Application

```bash
# Check if application is running
pm2 status

# Check logs
pm2 logs whatsapp-app

# Test webhook (if configured)
curl http://localhost:3000/health
```

## Step 13: WhatsApp QR Code Setup

1. **Check logs**: `pm2 logs whatsapp-app`
2. **Find QR code** in the logs
3. **Scan with your phone** (WhatsApp Business number)
4. **Verify connection** in logs

## Monitoring and Maintenance

### Health Check Script
```bash
# Create health check script
nano health-check.sh
```

```bash
#!/bin/bash
# Health check script
if ! curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "Application is down, restarting..."
    pm2 restart whatsapp-app
fi
```

```bash
# Make executable
chmod +x health-check.sh

# Add to crontab (run every 5 minutes)
crontab -e
# Add this line:
# */5 * * * * /path/to/health-check.sh
```

### Backup Script
```bash
# Create backup script
nano backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf backup_$DATE.tar.gz /home/whatsapp-app/whatsapp-ghl-integration
# Upload to cloud storage or send via email
```

## Troubleshooting

### Common Issues:

1. **Port 3000 not accessible**
   ```bash
   sudo ufw allow 3000
   ```

2. **Node.js not found**
   ```bash
   source ~/.bashrc
   ```

3. **PM2 not starting on boot**
   ```bash
   pm2 startup
   pm2 save
   ```

4. **WhatsApp connection issues**
   ```bash
   # Check logs
   pm2 logs whatsapp-app
   
   # Restart if needed
   pm2 restart whatsapp-app
   ```

## Security Best Practices

1. **Change default SSH port**
2. **Use SSH keys instead of passwords**
3. **Keep system updated**
4. **Use firewall**
5. **Regular backups**
6. **Monitor logs**

## Next Steps

1. **Complete the setup**
2. **Test WhatsApp connection**
3. **Configure GHL integration**
4. **Set up monitoring**
5. **Create backups**

Your VPS is now ready for your WhatsApp + GHL integration!
