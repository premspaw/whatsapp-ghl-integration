# Enhanced WhatsApp AI Chatbot Deployment Guide

This guide provides step-by-step instructions for deploying the enhanced WhatsApp AI Chatbot system with business knowledge integration.

## Deployment Options

### Option 1: VPS Deployment (Recommended)

#### Prerequisites
- Ubuntu 20.04 LTS or newer
- Root access or sudo privileges
- Domain name (for SSL)

#### Step 1: Server Setup
1. Update the system:
```bash
sudo apt update && sudo apt upgrade -y
```

2. Run the automated setup script:
```bash
chmod +x setup-vps-ai.sh
./setup-vps-ai.sh
```

3. Configure environment variables:
```bash
nano .env
```

#### Step 2: Database Setup
1. The setup script installs PostgreSQL with pgvector extension
2. Create the database and run migrations:
```bash
node run-supabase-migrations.js
```

#### Step 3: Start the Application
1. Start with PM2:
```bash
pm2 start server.js --name whatsapp-ai-chatbot
pm2 save
pm2 startup
```

2. Configure Nginx:
```bash
sudo nano /etc/nginx/sites-available/whatsapp-ai-chatbot
```

3. Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/whatsapp-ai-chatbot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

4. Set up SSL with Certbot:
```bash
sudo certbot --nginx -d yourdomain.com
```

### Option 2: Docker Deployment

#### Prerequisites
- Docker and Docker Compose installed
- Domain name (for SSL)

#### Step 1: Create Docker Compose File
```yaml
version: '3'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    volumes:
      - ./uploads:/app/uploads
    depends_on:
      - db
    restart: always

  db:
    image: ankane/pgvector
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=whatsapp_ai
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

volumes:
  postgres_data:
```

#### Step 2: Build and Start Containers
```bash
docker-compose up -d
```

#### Step 3: Run Migrations
```bash
docker-compose exec app node run-supabase-migrations.js
```

### Option 3: Cloud Platform Deployment

#### Render.com Deployment
1. Fork the repository to your GitHub account
2. Connect your GitHub account to Render
3. Create a new Web Service and select the repository
4. Configure environment variables
5. Deploy the application

#### Railway.app Deployment
1. Fork the repository to your GitHub account
2. Connect your GitHub account to Railway
3. Create a new project and select the repository
4. Add PostgreSQL plugin
5. Configure environment variables
6. Deploy the application

## Post-Deployment Steps

### 1. WhatsApp Connection
1. Access the dashboard at `https://yourdomain.com`
2. Scan the QR code with WhatsApp
3. Verify connection status

### 2. GHL Integration
1. Configure GHL webhook in the GHL dashboard
2. Set the webhook URL to `https://yourdomain.com/api/webhook/ghl`
3. Test the integration

### 3. Knowledge Base Setup
1. Upload PDF documents through the dashboard
2. Add website URLs for scraping
3. Verify knowledge base statistics

### 4. System Verification
1. Send a test message to the WhatsApp number
2. Check the AI response
3. Verify GHL conversation synchronization
4. Check analytics dashboard

## Scaling Considerations

### Horizontal Scaling
- Deploy multiple instances behind a load balancer
- Use Redis for session storage
- Configure sticky sessions for WebSocket connections

### Database Scaling
- Implement connection pooling
- Consider read replicas for high-traffic scenarios
- Monitor database performance

### Memory Optimization
- Adjust Node.js memory limits based on server capacity
- Monitor memory usage with PM2
- Implement garbage collection optimization

## Monitoring and Maintenance

### Health Checks
- Set up uptime monitoring
- Configure alerts for service disruptions
- Implement regular database backups

### Log Management
- Configure log rotation
- Set up centralized logging
- Monitor error rates

### Performance Monitoring
- Track response times
- Monitor AI service latency
- Analyze conversation metrics

## Troubleshooting

### Common Issues

#### WhatsApp Connection Problems
- Verify internet connectivity
- Check WhatsApp session status
- Restart the WhatsApp service

#### Database Connection Issues
- Verify database credentials
- Check network connectivity
- Ensure pgvector extension is enabled

#### AI Service Errors
- Verify API keys
- Check rate limits
- Monitor token usage

## Security Considerations

### API Security
- Use API keys for all external requests
- Implement rate limiting
- Validate all input data

### Data Protection
- Encrypt sensitive data
- Implement regular backups
- Follow data retention policies

### Network Security
- Configure firewall rules
- Use SSL/TLS for all connections
- Implement IP restrictions for admin access

## Conclusion

This deployment guide covers the essential steps for deploying the enhanced WhatsApp AI Chatbot system. For additional support or customization, refer to the project documentation or contact the system administrator.