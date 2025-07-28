# 🚀 SolMeme Creator Deployment Guide

**Complete deployment guide for production environments.**

## 📋 Prerequisites Checklist

Before deploying, ensure you have:

- [x] **Node.js 18+** installed
- [x] **Solana CLI** tools installed  
- [x] **Phantom Wallet** for testing
- [x] **API Keys** for required services
- [x] **Domain name** (for production)
- [x] **SSL Certificate** (recommended)

## 🔑 Required API Keys & Services

### 1. Solana RPC Service (Required)
Choose a paid RPC provider for reliability:

**QuickNode (Recommended)**
```bash
# Sign up at https://quicknode.com
# Create Solana Mainnet endpoint
# Copy your endpoint URL
SOLANA_RPC_URL=https://your-endpoint.solana-mainnet.quiknode.pro/your-api-key/
```

**Alchemy**
```bash
# Sign up at https://alchemy.com
# Create Solana app
# Copy API key
SOLANA_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

**Helius**
```bash
# Sign up at https://helius.xyz
# Generate API key
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY
```

### 2. Solana Wallet (Required)
```bash
# Generate new wallet
solana-keygen new --outfile deploy-wallet.json

# Convert to base58 for environment variable
# Use online converter or manual process
# Store in SOLANA_PRIVATE_KEY
```

### 3. AI Image Services (Choose One)

**OpenAI (Recommended)**
```bash
# Sign up at https://openai.com
# Create API key
OPENAI_API_KEY=sk-proj-your-api-key-here
```

**Stability AI**
```bash
# Sign up at https://stability.ai
# Generate API key  
STABILITY_API_KEY=sk-your-stability-api-key
```

### 4. Storage Services (Choose One)

**Arweave (Recommended)**
```bash
# Install Arweave CLI
npm install -g arweave

# Generate wallet
arweave key-create deploy-arweave.json

# Convert to JSON string for env var
ARWEAVE_WALLET='{"kty":"RSA","n":"..."}' # Full wallet JSON
```

**IPFS (Infura)**
```bash
# Sign up at https://infura.io
# Create IPFS project
IPFS_PROJECT_ID=your-project-id
IPFS_PROJECT_SECRET=your-project-secret
```

### 5. Security
```bash
# Generate JWT secret (32+ characters)
JWT_SECRET=$(openssl rand -base64 32)
```

## 🏗️ Environment Setup

### Production Environment File
Create `.env.production`:

```bash
# ================================
# PRODUCTION CONFIGURATION
# ================================

NODE_ENV=production
PORT=3001

# Frontend URL
FRONTEND_URL=https://yourdomain.com

# ================================
# SOLANA CONFIGURATION
# ================================
SOLANA_RPC_URL=https://your-paid-rpc-endpoint.com
SOLANA_PRIVATE_KEY=your_base58_private_key

# ================================
# AI SERVICES
# ================================
OPENAI_API_KEY=sk-proj-your-openai-key
# OR
STABILITY_API_KEY=sk-your-stability-key

# ================================
# STORAGE SERVICES  
# ================================
ARWEAVE_WALLET={"kty":"RSA","n":"your_arweave_wallet_json"}
# OR
IPFS_PROJECT_ID=your_infura_project_id
IPFS_PROJECT_SECRET=your_infura_secret

# ================================
# SECURITY
# ================================
JWT_SECRET=your_32_char_plus_jwt_secret

# ================================
# MONITORING
# ================================
LOG_LEVEL=info
METRICS_ENABLED=true
HEALTH_CHECK_INTERVAL=60000

# ================================
# RATE LIMITING
# ================================
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100
TOKEN_CREATION_WINDOW=3600000
TOKEN_CREATION_MAX_REQUESTS=10
```

## 🌐 Deployment Options

### Option 1: Vercel (Recommended for Serverless)

#### 1. Prepare for Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Create vercel.json
cat > vercel.json << EOF
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    },
    {
      "src": "index.html",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
EOF
```

#### 2. Deploy to Vercel
```bash
# Login to Vercel
vercel login

# Deploy
vercel --prod

# Add environment variables via dashboard
# https://vercel.com/dashboard -> Project -> Settings -> Environment Variables
```

#### 3. Configure Environment Variables
In Vercel dashboard, add each environment variable:
- `SOLANA_RPC_URL`
- `SOLANA_PRIVATE_KEY`
- `OPENAI_API_KEY` (or `STABILITY_API_KEY`)
- `ARWEAVE_WALLET` (or `IPFS_PROJECT_ID` + `IPFS_PROJECT_SECRET`)
- `JWT_SECRET`

### Option 2: Railway (Simple & Fast)

#### 1. Connect Repository
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and connect
railway login
railway link

# Deploy
railway up
```

#### 2. Configure Environment
```bash
# Add environment variables
railway variables set SOLANA_RPC_URL="your-rpc-url"
railway variables set SOLANA_PRIVATE_KEY="your-private-key"
railway variables set OPENAI_API_KEY="your-openai-key"
railway variables set JWT_SECRET="your-jwt-secret"
# ... add all other variables
```

### Option 3: DigitalOcean App Platform

#### 1. Create App
- Go to [DigitalOcean Apps](https://cloud.digitalocean.com/apps)
- Create app from GitHub repository
- Choose Node.js runtime

#### 2. Configure Build
```yaml
# app.yaml
name: solmeme-creator
services:
- name: api
  source_dir: /
  github:
    repo: your-username/solmeme-creator
    branch: main
  run_command: npm start
  build_command: npm run build
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
  # Add other environment variables in dashboard
```

#### 3. Add Environment Variables
In DigitalOcean dashboard:
- Go to Apps → Your App → Settings → Environment Variables
- Add all required environment variables

### Option 4: Heroku

#### 1. Prepare for Heroku
```bash
# Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# Create app
heroku create your-app-name

# Add Node.js buildpack
heroku buildpacks:set heroku/nodejs
```

#### 2. Configure Environment
```bash
# Add environment variables
heroku config:set SOLANA_RPC_URL="your-rpc-url"
heroku config:set SOLANA_PRIVATE_KEY="your-private-key"
heroku config:set OPENAI_API_KEY="your-openai-key"
heroku config:set JWT_SECRET="your-jwt-secret"
# ... add all variables
```

#### 3. Deploy
```bash
# Deploy
git push heroku main

# Check logs
heroku logs --tail
```

### Option 5: AWS (Advanced)

#### 1. Elastic Beanstalk Deployment
```bash
# Install EB CLI
pip install awsebcli

# Initialize
eb init

# Create environment
eb create production

# Deploy
eb deploy
```

#### 2. Configure Environment Variables
```bash
# Add environment variables
eb setenv SOLANA_RPC_URL="your-rpc-url" \
         SOLANA_PRIVATE_KEY="your-private-key" \
         OPENAI_API_KEY="your-openai-key" \
         JWT_SECRET="your-jwt-secret"
```

#### 3. Load Balancer & Auto Scaling
```yaml
# .ebextensions/01_environment.config
option_settings:
  aws:autoscaling:launchconfiguration:
    InstanceType: t3.micro
  aws:elasticbeanstalk:environment:
    LoadBalancerType: application
  aws:elasticbeanstalk:environment:process:default:
    HealthCheckPath: /api/health
    Port: 3001
```

### Option 6: Google Cloud Run

#### 1. Create Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Create required directories
RUN mkdir -p logs data temp

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start application
CMD ["npm", "start"]
```

#### 2. Deploy to Cloud Run
```bash
# Build and deploy
gcloud run deploy solmeme-creator \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production" \
  --max-instances=10
```

#### 3. Add Environment Variables
```bash
# Update service with environment variables
gcloud run services update solmeme-creator \
  --set-env-vars="SOLANA_RPC_URL=your-rpc-url,OPENAI_API_KEY=your-key" \
  --region=us-central1
```

### Option 7: Traditional VPS (Ubuntu/Debian)

#### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo apt install nginx

# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx
```

#### 2. Deploy Application
```bash
# Clone repository
git clone https://github.com/your-username/solmeme-creator.git
cd solmeme-creator

# Install dependencies
npm ci --only=production

# Create production environment file
cp .env.example .env.production
# Edit .env.production with your values

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'solmeme-creator',
    script: './server.js',
    env_file: '.env.production',
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    time: true
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 3. Configure Nginx
```bash
# Create Nginx configuration
sudo tee /etc/nginx/sites-available/solmeme-creator << EOF
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/solmeme-creator /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 4. Setup SSL
```bash
# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

#### 5. Setup Monitoring
```bash
# Install monitoring tools
sudo apt install htop iotop nethogs

# Setup log rotation
sudo tee /etc/logrotate.d/solmeme-creator << EOF
/home/ubuntu/solmeme-creator/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 ubuntu ubuntu
    postrotate
        pm2 reload solmeme-creator
    endscript
}
EOF
```

## 🔐 Security Configuration

### 1. Environment Variables Security
```bash
# Set proper file permissions
chmod 600 .env.production

# Use environment variable management
# For Vercel: Use dashboard
# For Heroku: Use heroku config
# For VPS: Use systemd environment files
```

### 2. Firewall Configuration (VPS)
```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 3. SSL/TLS Configuration
```bash
# Modern SSL configuration for Nginx
sudo tee -a /etc/nginx/sites-available/solmeme-creator << EOF
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
EOF
```

### 4. Rate Limiting (Nginx)
```bash
# Add rate limiting to Nginx
sudo tee -a /etc/nginx/nginx.conf << EOF
http {
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone \$binary_remote_addr zone=auth:10m rate=5r/m;
    
    # ... existing config
}
EOF

# Apply to site
sudo tee -a /etc/nginx/sites-available/solmeme-creator << EOF
    location /api/auth/ {
        limit_req zone=auth burst=3 nodelay;
        proxy_pass http://localhost:3001;
        # ... other proxy settings
    }
    
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3001;
        # ... other proxy settings
    }
EOF
```

## 📊 Monitoring & Maintenance

### 1. Health Monitoring
```bash
# Create health check script
cat > health-check.sh << EOF
#!/bin/bash
response=\$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health)
if [ \$response != "200" ]; then
    echo "Health check failed with status: \$response"
    pm2 restart solmeme-creator
    # Send alert (email, Slack, etc.)
fi
EOF

chmod +x health-check.sh

# Add to crontab
echo "*/5 * * * * /path/to/health-check.sh" | crontab -
```

### 2. Log Monitoring
```bash
# Monitor error logs
tail -f logs/error.log

# Monitor application logs
pm2 logs solmeme-creator

# Check system logs
sudo journalctl -u nginx -f
```

### 3. Performance Monitoring
```bash
# Monitor system resources
htop

# Monitor network
nethogs

# Monitor disk usage
df -h

# Monitor application metrics
curl http://localhost:3001/api/health/metrics
```

### 4. Backup Strategy
```bash
# Create backup script
cat > backup.sh << EOF
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# Create backup directory
mkdir -p \$BACKUP_DIR

# Backup application data
tar -czf \$BACKUP_DIR/solmeme-data-\$DATE.tar.gz ./data

# Backup configuration
cp .env.production \$BACKUP_DIR/env-\$DATE.backup

# Backup logs (last 7 days)
find ./logs -name "*.log" -mtime -7 -exec cp {} \$BACKUP_DIR/ \;

# Cleanup old backups (keep 30 days)
find \$BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
find \$BACKUP_DIR -name "*.backup" -mtime +30 -delete

echo "Backup completed: \$DATE"
EOF

chmod +x backup.sh

# Run daily backup
echo "0 2 * * * /path/to/backup.sh" | crontab -
```

## 🔄 Updates & Maintenance

### 1. Application Updates
```bash
# Create update script
cat > update.sh << EOF
#!/bin/bash
echo "Starting update..."

# Pull latest code
git pull origin main

# Install dependencies
npm ci --only=production

# Restart application
pm2 restart solmeme-creator

# Health check
sleep 10
curl -f http://localhost:3001/api/health || {
    echo "Health check failed, rolling back..."
    git checkout HEAD~1
    npm ci --only=production
    pm2 restart solmeme-creator
    exit 1
}

echo "Update completed successfully"
EOF

chmod +x update.sh
```

### 2. Database Maintenance
```bash
# Cleanup old sessions (if using file-based DB)
cat > cleanup.sh << EOF
#!/bin/bash
cd /path/to/solmeme-creator
node -e "
const db = require('./services/databaseService.js');
db.cleanup().then(() => {
    console.log('Database cleanup completed');
    process.exit(0);
}).catch(err => {
    console.error('Cleanup failed:', err);
    process.exit(1);
});
"
EOF

# Run weekly cleanup
echo "0 3 * * 0 /path/to/cleanup.sh" | crontab -
```

## 🚨 Troubleshooting Deployment Issues

### Common Issues

#### **Port Already in Use**
```bash
# Find process using port 3001
lsof -i :3001

# Kill process
kill -9 <PID>

# Or change port in environment
export PORT=3002
```

#### **Permission Denied**
```bash
# Fix file permissions
chmod +x server.js
chown -R $USER:$USER .

# Fix log directory permissions
mkdir -p logs data temp
chmod 755 logs data temp
```

#### **Environment Variables Not Loading**
```bash
# Check environment file exists
ls -la .env*

# Test environment loading
node -e "require('dotenv').config(); console.log(process.env.NODE_ENV);"

# Debug environment in application
curl http://localhost:3001/api/health/dependencies
```

#### **Database/Storage Issues**
```bash
# Check data directory permissions
ls -la data/

# Reset database (development only)
rm -rf data/*

# Test storage services
curl -X POST http://localhost:3001/api/health/detailed
```

#### **SSL Certificate Issues**
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Test SSL configuration
openssl s_client -connect yourdomain.com:443
```

### Performance Issues

#### **High Memory Usage**
```bash
# Monitor memory
free -h
ps aux --sort=-%mem | head

# Restart application
pm2 restart solmeme-creator

# Adjust PM2 configuration
pm2 delete solmeme-creator
pm2 start ecosystem.config.js
```

#### **Slow API Response**
```bash
# Check API metrics
curl http://localhost:3001/api/health/metrics

# Monitor network
netstat -tuln
ss -tuln

# Check external service status
curl -I https://api.openai.com
curl -I https://arweave.net
```

#### **Database Performance**
```bash
# Check file system performance
iostat -x 1

# Monitor disk usage
du -sh data/
df -h

# Cleanup old data
node -e "require('./services/databaseService.js').cleanup()"
```

## 📋 Post-Deployment Checklist

### Functionality Testing
- [ ] Health check returns 200 OK
- [ ] Phantom wallet connection works
- [ ] Authentication flow completes
- [ ] Token creation succeeds
- [ ] AI image generation works
- [ ] Storage services operational
- [ ] Error handling working
- [ ] Rate limiting active

### Security Verification
- [ ] HTTPS working correctly
- [ ] Environment variables secure
- [ ] CORS configured properly
- [ ] Rate limiting active
- [ ] Input validation working
- [ ] Error messages don't leak info
- [ ] Logs don't contain secrets

### Performance Verification
- [ ] Response times < 2 seconds
- [ ] Memory usage stable
- [ ] CPU usage reasonable
- [ ] Database performance good
- [ ] External API calls working
- [ ] Caching working (if implemented)

### Monitoring Setup
- [ ] Health checks running
- [ ] Log rotation configured
- [ ] Backup script working
- [ ] Alert system active
- [ ] Metrics collection working
- [ ] Error tracking setup

---

## 🆘 Support

### Deployment Issues
- **GitHub Issues**: [Report deployment problems](https://github.com/yourusername/solmeme-creator/issues)
- **Community Help**: [Discord support channel](https://discord.gg/solmeme)

### Professional Support
- **Enterprise Deployment**: Custom deployment assistance
- **Security Audits**: Code and infrastructure review
- **Performance Optimization**: Scaling and optimization

---

*Deployment Guide v1.0.0 - Production Ready*