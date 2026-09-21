#!/bin/bash
set -e

PEM_KEY="/Users/apple/Documents/ProHostix/credentials/pypeerm.pem"
SERVER_USER="ubuntu"
SERVER_IP="13.232.188.79"
TARGET_DIR="/var/www/pype-erm"

echo "=================================================="
echo "🚀 Local Build & Deploy to AWS (DIST ONLY)"
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
echo "📂 Preparing remote directory structure..."
ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "sudo mkdir -p $TARGET_DIR/client $TARGET_DIR/server && sudo chown -R $SERVER_USER:$SERVER_USER $TARGET_DIR"

# 4. Sync Files to Server (ONLY WHAT IS NEEDED)
echo "📤 Uploading deployment script..."
rsync -avz -e "ssh -i $PEM_KEY -o StrictHostKeyChecking=no" ./deploy.sh $SERVER_USER@$SERVER_IP:$TARGET_DIR/

echo "📤 Uploading Client Files (dist & package.json)..."
rsync -avz -e "ssh -i $PEM_KEY -o StrictHostKeyChecking=no" ./client/dist/ $SERVER_USER@$SERVER_IP:$TARGET_DIR/client/dist/
rsync -avz -e "ssh -i $PEM_KEY -o StrictHostKeyChecking=no" ./client/package.json $SERVER_USER@$SERVER_IP:$TARGET_DIR/client/

echo "📤 Uploading Server Files (dist, prisma & package.json)..."
rsync -avz -e "ssh -i $PEM_KEY -o StrictHostKeyChecking=no" ./server/dist/ $SERVER_USER@$SERVER_IP:$TARGET_DIR/server/dist/
rsync -avz -e "ssh -i $PEM_KEY -o StrictHostKeyChecking=no" ./server/package.json $SERVER_USER@$SERVER_IP:$TARGET_DIR/server/
rsync -avz -e "ssh -i $PEM_KEY -o StrictHostKeyChecking=no" ./server/package-lock.json $SERVER_USER@$SERVER_IP:$TARGET_DIR/server/ 2>/dev/null || true
rsync -avz -e "ssh -i $PEM_KEY -o StrictHostKeyChecking=no" ./server/prisma/ $SERVER_USER@$SERVER_IP:$TARGET_DIR/server/prisma/

# 5. Execute deployment script on the server
echo "🚀 Running deployment script on AWS..."
ssh -i "$PEM_KEY" -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "cd $TARGET_DIR && chmod +x deploy.sh && ./deploy.sh"

echo "=================================================="
echo "✅ Deployment completed successfully! (Source code kept local)"
echo "=================================================="
