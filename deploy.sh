#!/bin/bash

# Exit on any error
set -e

# Increase Node memory limit to prevent Vite compiler OOM on 1GB RAM instances
export NODE_OPTIONS="--max-old-space-size=2048"

echo "=================================================="
echo "🚀 Starting Pype-ERM Production Deployment Script"
echo "=================================================="

# 1. Update system packages
echo "📦 Updating system package lists..."
sudo apt-get update -y

# 2. Install Node.js v20 LTS
if ! command -v node &> /dev/null; then
    echo "🟢 Node.js not found. Installing Node.js v20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js is already installed: $(node -v)"
fi

# 3. Install Git and Nginx
echo "🟢 Installing Git, Nginx, and build dependencies..."
sudo apt-get install -y git nginx build-essential

# 4. Install PM2 Process Manager globally
if ! command -v pm2 &> /dev/null; then
    echo "🟢 PM2 not found. Installing PM2 globally..."
    sudo npm install -g pm2
else
    echo "✅ PM2 is already installed: $(pm2 -v)"
fi

# 5. Setup Project Folder Permissions
echo "🟢 Setting up application directory permissions..."
sudo mkdir -p /var/www/pype-erm
sudo chown -R ubuntu:ubuntu /var/www/pype-erm

# 6. Copy or Clone project contents to /var/www/pype-erm
# Note: If running this script inside the cloned repository, we will copy the files.
if [ -d "./client" ] && [ -d "./server" ] && [ "$PWD" != "/var/www/pype-erm" ]; then
    echo "📂 Local repository files found. Copying files to /var/www/pype-erm..."
    cp -R ./* /var/www/pype-erm/
else
    echo "📂 Cloning repository from GitHub..."
    if [ -d "/var/www/pype-erm/.git" ]; then
        cd /var/www/pype-erm
        git pull origin main
    else
        git clone https://github.com/prohostix/Pype-ERM.git /var/www/pype-erm
    fi
fi

# 7. Configure Server Environment variables (.env)
cd /var/www/pype-erm/server
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found in server. Creating placeholder. Please edit this file later!"
    cat <<EOT >> .env
NODE_ENV=production
PORT=6478
API_VERSION=v1
DATABASE_URL="postgresql://postgres:pypeerm123%40@db.pcdohsutepsgapcchmdj.supabase.co:5432/postgres?schema=public"
JWT_SECRET="production-jwt-secret-$(openssl rand -hex 16)"
JWT_EXPIRE=7d
JWT_REFRESH_SECRET="production-refresh-secret-$(openssl rand -hex 16)"
JWT_REFRESH_EXPIRE=30d
CORS_ORIGIN="http://13.232.188.79"
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=1000
EOT
    echo "📝 Default .env created with Supabase database URL."
else
    echo "✅ Existing server .env file detected."
fi

# 8. Build Server
echo "🛠️  Building Backend Server..."
npm install
npx prisma db push
npx prisma generate
export NODE_OPTIONS="--max-old-space-size=2048"
npm run build
cp -R src/generated dist/

# 9. Start Server via PM2
echo "🚀 Starting backend server with PM2..."
sudo -u ubuntu pm2 restart pype-erm-server || sudo -u ubuntu pm2 start dist/server.js --name pype-erm-server

sudo -u ubuntu pm2 save

# 10. Build Client
echo "🛠️  Building Frontend Client..."
cd /var/www/pype-erm/client
if [ ! -f ".env" ]; then
    echo "VITE_API_URL=http://13.232.188.79/api/v1" > .env
fi
npm install
export NODE_OPTIONS="--max-old-space-size=2048"
npm run build

# 11. Configure Nginx Reverse Proxy
echo "🌐 Configuring Nginx Reverse Proxy..."
sudo tee /etc/nginx/sites-available/pype-erm > /dev/null <<'EOT'
server {
    listen 80;
    server_name pypeerm.com www.pypeerm.com 13.232.188.79;

    location / {
        root /var/www/pype-erm/client/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:6478/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /socket.io/ {
        proxy_pass http://localhost:6478/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOT

# Enable config and restart
if [ -f "/etc/nginx/sites-enabled/default" ]; then
    sudo rm /etc/nginx/sites-enabled/default || true
fi
sudo ln -sf /etc/nginx/sites-available/pype-erm /etc/nginx/sites-enabled/pype-erm
sudo chmod -R 755 /var/www/pype-erm
sudo nginx -t
sudo systemctl restart nginx

# Automatically re-apply Certbot SSL configuration if certificate exists
if sudo test -d "/etc/letsencrypt/live/pypeerm.com"; then
    echo "🔒 SSL Certificates found. Re-applying Certbot SSL configuration..."
    sudo certbot --nginx -d pypeerm.com -d www.pypeerm.com --non-interactive --agree-tos -m dilshadbvoc@gmail.com --redirect
    sudo systemctl restart nginx
fi

# 12. Setup PM2 Startup script
echo "🔄 Configuring PM2 to launch on system boot..."
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu || true

echo "=================================================="
echo "🎉 Pype-ERM Deployment Completed Successfully!"
echo "💻 Access your app at: http://13.232.188.79"
echo "=================================================="
