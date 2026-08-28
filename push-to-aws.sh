#!/bin/bash
set -e

PEM_KEY="/Users/retro/Downloads/pypeerm.pem"
SERVER_USER="ubuntu"
SERVER_IP="13.232.188.79"
TARGET_DIR="/var/www/pype-erm"

echo "=================================================="
echo "🚀 Local Build & Deploy to AWS"
echo "=================================================="

# Ensure PEM key has correct permissions
chmod 400 "$PEM_KEY"

# 1. Build Client Locally
echo "🛠️ Building Client Locally..."
cd client
npm install
npm run build
cd ..

# 2. Build Server Locally
echo "🛠️ Building Server Locally..."
cd server
npm install
npm run build
cd ..

# 3. Create Target Directory on Server
echo "📂 Preparing remote directory..."
ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "sudo mkdir -p $TARGET_DIR && sudo chown -R $SERVER_USER:$SERVER_USER $TARGET_DIR"

# 4. Sync Files to Server
echo "📤 Uploading files to AWS (skipping node_modules and git)..."
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'client/node_modules' \
  --exclude 'server/node_modules' \
  --exclude '.env' \
  -e "ssh -i $PEM_KEY -o StrictHostKeyChecking=no" \
  ./ $SERVER_USER@$SERVER_IP:$TARGET_DIR/

# 5. Execute deployment script on the server
echo "🚀 Running deployment script on AWS..."
ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "cd $TARGET_DIR && chmod +x deploy.sh && ./deploy.sh"

echo "=================================================="
echo "✅ Deployment completed successfully!"
echo "=================================================="
