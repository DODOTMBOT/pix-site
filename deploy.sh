#!/bin/bash
set -e

echo "=== PiX Stage 1 Deployment ==="

# 1. Собери фронт локально
echo "[1/6] Building frontend..."
cd ~/Desktop/imp2
npm run build

# 2. Залей код на сервер
echo "[2/6] Deploying to server..."
ssh -p 2222 root@72.56.249.243 << 'ENDSSH'
set -e

# Останови старый процесс
echo "  → Stopping old backend..."
pkill -f "node /var/www/imp/backend/server.js" || true
sleep 2

# Удали старый бэкенд
echo "  → Removing old backend..."
rm -rf /var/www/imp/backend
mkdir -p /var/www/imp/backend

# Скачай свежий код с GitHub
echo "  → Pulling fresh code..."
cd /var/www/imp
rm -rf temp-deploy
git clone --depth 1 https://github.com/DODOTMBOT/pix-site.git temp-deploy
cd temp-deploy

# Перенеси бэкенд
echo "  → Installing backend..."
cp -r backend/* /var/www/imp/backend/
cd /var/www/imp/backend

# Создай .env с безопасным JWT
echo "  → Creating .env..."
JWT_SECRET=$(openssl rand -hex 32)
cat > .env << EOF
PORT=3000
JWT_SECRET=$JWT_SECRET
NODE_ENV=production
EOF

# Установи зависимости
echo "  → Installing dependencies..."
npm install --production

# Установи PM2 глобально
echo "  → Installing PM2..."
npm install -g pm2

# Запусти через PM2
echo "  → Starting backend with PM2..."
pm2 delete pix-backend 2>/dev/null || true
pm2 start server.js --name pix-backend
pm2 save
pm2 startup systemd -u root --hp /root

# Удали временную папку
cd /var/www/imp
rm -rf temp-deploy

echo "  → Backend deployed!"
ENDSSH

# 3. Залей фронт
echo "[3/6] Uploading frontend..."
rsync -avz --delete -e "ssh -p 2222" ~/Desktop/imp2/dist/ root@72.56.249.243:/var/www/pix/

# 4. Проверь статус
echo "[4/6] Checking backend status..."
ssh -p 2222 root@72.56.249.243 "pm2 status"

# 5. Тест API
echo "[5/6] Testing API..."
sleep 3
curl -s https://pix-dodo.ru/api/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pix-dodo.ru","password":"admin123"}' | head -c 200
echo ""

echo ""
echo "=== ✅ DEPLOYMENT COMPLETE ==="
echo ""
echo "🌐 Site: https://pix-dodo.ru"
echo "🔐 Login: admin@pix-dodo.ru / admin123"
echo ""
echo "📊 Check logs: ssh -p 2222 root@72.56.249.243 'pm2 logs pix-backend'"
echo ""
