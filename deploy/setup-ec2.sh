#!/bin/bash
# deploy/setup-ec2.sh
# Run this ONCE on a fresh AWS EC2 Ubuntu 22.04 instance to set everything up
# Usage: bash setup-ec2.sh

set -e
echo "🚀 Setting up Textile Billing System on AWS EC2..."

# ── 1. System packages ────────────────────────────────────────────────────────
echo "📦 Installing system packages..."
sudo apt-get update -y
sudo apt-get install -y curl git nginx unzip

# ── 2. Node.js 20 ─────────────────────────────────────────────────────────────
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# ── 3. PM2 (process manager) ──────────────────────────────────────────────────
echo "📦 Installing PM2..."
sudo npm install -g pm2
pm2 startup systemd -u ubuntu --hp /home/ubuntu

# ── 4. Puppeteer dependencies (for PDF generation) ────────────────────────────
echo "📦 Installing Chromium dependencies for PDF generation..."
sudo apt-get install -y \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 \
  libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 \
  libpangocairo-1.0-0 libpango-1.0-0 libcairo2 libx11-6 libx11-xcb1 libxcb1 \
  libxext6 libxfixes3 libxi6 libxrender1 libxtst6 fonts-liberation \
  libappindicator3-1 xdg-utils wget ca-certificates

# ── 5. MongoDB Community ──────────────────────────────────────────────────────
echo "🍃 Installing MongoDB..."
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update -y
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# ── 6. Clone your repository ──────────────────────────────────────────────────
echo "📥 Cloning repository..."
cd /home/ubuntu
# Replace with your actual GitHub repo URL:
git clone https://github.com/YOUR_USERNAME/textile-billing.git
cd textile-billing

# ── 7. Backend setup ──────────────────────────────────────────────────────────
echo "⚙️  Setting up backend..."
cd backend
npm ci --omit=dev

# Create .env file for production
cat > .env << 'ENV'
MONGO_URI=mongodb://localhost:27017/textilebilling
JWT_SECRET=CHANGE_THIS_TO_A_RANDOM_SECRET_STRING
PORT=5000
NODE_ENV=production
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here
APP_URL=http://YOUR_EC2_PUBLIC_IP
ENV

# Seed initial data
node scripts/seed.js
cd ..

# ── 8. Frontend build ─────────────────────────────────────────────────────────
echo "🏗️  Building frontend..."
cd frontend
npm ci
npm run build
cd ..

# ── 9. Set up web root ────────────────────────────────────────────────────────
echo "🌐 Setting up Nginx web root..."
sudo mkdir -p /var/www/textile-billing
sudo cp -r frontend/dist/* /var/www/textile-billing/
sudo chown -R www-data:www-data /var/www/textile-billing/

# ── 10. Nginx config ──────────────────────────────────────────────────────────
echo "🌐 Configuring Nginx..."
sudo cp nginx.conf /etc/nginx/sites-available/textile-billing
sudo ln -sf /etc/nginx/sites-available/textile-billing /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# ── 11. Create log directory ──────────────────────────────────────────────────
sudo mkdir -p /var/log/textile-billing
sudo chown ubuntu:ubuntu /var/log/textile-billing

# ── 12. Start backend with PM2 ────────────────────────────────────────────────
echo "🚀 Starting backend..."
pm2 start ecosystem.config.js --env production
pm2 save

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup complete!"
echo ""
echo "NEXT STEPS:"
echo "  1. Edit /home/ubuntu/textile-billing/backend/.env"
echo "     → Set JWT_SECRET to a random 32-char string"
echo "     → Set SMTP_USER and SMTP_PASS for email"
echo "     → Set APP_URL to your EC2 public IP or domain"
echo ""
echo "  2. Edit /etc/nginx/sites-available/textile-billing"
echo "     → Replace YOUR_DOMAIN_OR_EC2_IP with real IP"
echo "     → Run: sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "  3. For HTTPS (free SSL):"
echo "     sudo apt install certbot python3-certbot-nginx"
echo "     sudo certbot --nginx -d yourdomain.com"
echo ""
echo "  4. Your app will be at: http://$(curl -s ifconfig.me)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
