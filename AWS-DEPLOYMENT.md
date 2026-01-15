# Sea Battle - AWS Deployment Guide

## Prerequisites
- AWS EC2 instance (Ubuntu/Amazon Linux or Windows Server)
- Node.js 18+ installed
- Security groups configured (ports 3001, 8080, 22/3389)

## Quick Deploy

### Linux/Mac (EC2):
```bash
chmod +x deploy-aws.sh
./deploy-aws.sh
```

### Windows Server:
```bash
deploy-aws.bat
```

## Manual Deployment Steps

### 1. Connect to EC2
```bash
ssh -i your-key.pem ec2-user@your-ec2-ip
```

### 2. Install Node.js (if not installed)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Clone/Upload Your Code
```bash
git clone your-repo-url
cd Sea-battle
```

### 4. Set Environment Variables
```bash
export CLIENT_URL="http://your-ec2-ip:8080"
export PORT=3001
```

Or create `.env` file:
```
PORT=3001
CLIENT_URL=http://your-ec2-ip:8080
NODE_ENV=production
```

### 5. Install Dependencies
```bash
npm install
npm install -g pm2
```

### 6. Build Frontend
```bash
npm run build
```

### 7. Start Services
```bash
# Start backend server
pm2 start backend/server.js --name sea-battle-server

# Start frontend (serves built files)
pm2 serve dist 8080 --spa --name sea-battle-frontend

# Save PM2 configuration
pm2 save

# Auto-restart on reboot
pm2 startup
```

## AWS Security Group Configuration

Open these ports in your EC2 security group:
- **Port 3001** - WebSocket server (TCP)
- **Port 8080** - Frontend (HTTP)
- **Port 22** - SSH (for Linux)
- **Port 3389** - RDP (for Windows)

## Using Custom Domain

### 1. Update Environment Variables
```bash
export CLIENT_URL="https://yourdomain.com"
```

### 2. Update Frontend Code
In `src/hooks/useMultiplayer.ts`:
```javascript
const SERVER_URL = 'https://api.yourdomain.com';
```

### 3. Setup Nginx as Reverse Proxy (Optional)
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:8080;
    }
}

server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Monitoring

```bash
# Check status
pm2 status

# View logs
pm2 logs

# Restart services
pm2 restart all

# Stop services
pm2 stop all
```

## Troubleshooting

**Connection refused:**
- Check security groups allow ports 3001 and 8080
- Verify services running: `pm2 status`

**CORS errors:**
- Update CLIENT_URL to match your frontend URL
- Rebuild and restart: `npm run build && pm2 restart all`

**WebSocket not connecting:**
- Ensure port 3001 open in security group
- Check if using HTTPS (needs WSS protocol)

## Cost Optimization

- Use AWS Amplify for frontend (free tier)
- Use EC2 t2.micro or t3.micro for backend
- Or use AWS Lambda + API Gateway for serverless backend
