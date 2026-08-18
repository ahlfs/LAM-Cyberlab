#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "🚀 LAM-Cyberlab VPS Deployment Script (PM2 & Fixes)"
echo "=========================================================="
echo ""

# 1. Ask for secrets
echo "You need an API_SERVER_KEY (a secure password) so the Workspace can securely talk to the Agent."
echo "You can make one up (e.g. 'my-secret-token') or press Enter to auto-generate a strong one."
read -p "Enter API_SERVER_KEY (leave blank to auto-generate): " API_TOKEN

if [ -z "$API_TOKEN" ]; then
    API_TOKEN=$(openssl rand -hex 32)
    echo "🔑 Auto-generated API_SERVER_KEY: $API_TOKEN"
fi
echo ""

read -p "Enter a password for the LAM-Cyberlab UI (HERMES_PASSWORD): " UI_PASSWORD
echo ""

# 2. Configure Gateway (.env in ~/.hermes)
HERMES_ENV="$HOME/.hermes/.env"
echo "⚙️ Configuring Hermes Agent backend in $HERMES_ENV..."
mkdir -p "$HOME/.hermes"
touch "$HERMES_ENV"

# Remove existing API_SERVER lines to avoid duplicates
if [ "$(uname)" = "Darwin" ]; then
  sed -i '' '/API_SERVER_ENABLED/d' "$HERMES_ENV"
  sed -i '' '/API_SERVER_KEY/d' "$HERMES_ENV"
else
  sed -i '/API_SERVER_ENABLED/d' "$HERMES_ENV"
  sed -i '/API_SERVER_KEY/d' "$HERMES_ENV"
fi

echo 'API_SERVER_ENABLED=true' >> "$HERMES_ENV"
echo "API_SERVER_KEY=$API_TOKEN" >> "$HERMES_ENV"

# 3. Configure Workspace (.env in current dir)
WORKSPACE_ENV=".env"
echo "⚙️ Configuring LAM-Cyberlab frontend in $WORKSPACE_ENV..."
if [ ! -f "$WORKSPACE_ENV" ] && [ -f ".env.example" ]; then
    cp .env.example "$WORKSPACE_ENV"
else
    touch "$WORKSPACE_ENV"
fi

# Remove existing lines to avoid duplicates
if [ "$(uname)" = "Darwin" ]; then
  sed -i '' '/HERMES_PASSWORD=/d' "$WORKSPACE_ENV"
  sed -i '' '/HERMES_API_TOKEN=/d' "$WORKSPACE_ENV"
  sed -i '' '/COOKIE_SECURE=/d' "$WORKSPACE_ENV"
else
  sed -i '/HERMES_PASSWORD=/d' "$WORKSPACE_ENV"
  sed -i '/HERMES_API_TOKEN=/d' "$WORKSPACE_ENV"
  sed -i '/COOKIE_SECURE=/d' "$WORKSPACE_ENV"
fi

echo "HERMES_PASSWORD=$UI_PASSWORD" >> "$WORKSPACE_ENV"
echo "HERMES_API_TOKEN=$API_TOKEN" >> "$WORKSPACE_ENV"
echo "COOKIE_SECURE=0" >> "$WORKSPACE_ENV"

# 4. Build and Restart PM2
echo "🏗️ Building workspace..."
pnpm build

echo "🧹 Cleaning up old processes..."
pm2 delete all 2>/dev/null || true
hermes gateway stop 2>/dev/null || true

echo "🚀 Starting PM2 stack..."
pm2 start ecosystem.config.cjs
pm2 save

echo ""
echo "✅ Setup Complete!"
echo "Check health: curl -s http://127.0.0.1:8642/health"
echo "You can now log in using your server's IP address on port 3000."
echo "If this is your first time, you may want to run 'pm2 startup' to persist across reboots."
