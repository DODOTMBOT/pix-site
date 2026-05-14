#!/bin/bash
set -e

echo "=== PiX Deployment ==="

# 1. Собери фронт локально
echo "[1/6] Building frontend..."
cd ~/Desktop/imp2
npm run build

# 2. Залей код на сервер
echo "[2/6] Deploying to server..."
ssh -p 2222 root@72.56.249.243 << 'ENDSSH'
set -e

# Убедись что папка data существует и НИКОГДА не удаляется
# Здесь живут dodo.db, sessions.db и .env с секретами
mkdir -p /var/www/imp/data

# Сохрани SESSION_SECRET до того как удалим backend
# Если он уже есть в .env — берём его, иначе генерируем один раз
if [ -f /var/www/imp/backend/.env ] && grep -q SESSION_SECRET /var/www/imp/backend/.env; then
  SESSION_SECRET=$(grep '^SESSION_SECRET=' /var/www/imp/backend/.env | cut -d= -f2-)
else
  SESSION_SECRET=$(openssl rand -hex 32)
  echo "  → Generated new SESSION_SECRET"
fi

# Останови старый процесс
echo "  → Stopping old backend..."
pkill -f "node /var/www/imp/backend/server.js" || true
sleep 2

# Удали старый код бэкенда (но НЕ /var/www/imp/data !)
echo "  → Removing old backend code..."
rm -rf /var/www/imp/backend
mkdir -p /var/www/imp/backend

# Скачай свежий код с GitHub
echo "  → Pulling fresh code..."
rm -rf /var/www/imp/temp-deploy
git clone --depth 1 https://github.com/DODOTMBOT/pix-site.git /var/www/imp/temp-deploy

# Перенеси только код бэкенда
echo "  → Installing backend..."
cp -r /var/www/imp/temp-deploy/backend/* /var/www/imp/backend/
cd /var/www/imp/backend

# Запиши .env с сохранённым секретом
cat > .env << EOF
PORT=3000
SESSION_SECRET=$SESSION_SECRET
NODE_ENV=production
EOF

# Установи зависимости
echo "  → Installing dependencies..."
npm install --production

# Установи PM2 глобально если нет
npm install -g pm2 2>/dev/null || true

# Запусти через PM2
echo "  → Starting backend with PM2..."
pm2 delete pix-backend 2>/dev/null || true
pm2 start server.js --name pix-backend
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

# Удали временную папку
rm -rf /var/www/imp/temp-deploy

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
echo "=== DEPLOYMENT COMPLETE ==="
echo ""
echo "Site: https://pix-dodo.ru"
echo "Login: admin@pix-dodo.ru / admin123"
echo ""
echo "Check logs: ssh -p 2222 root@72.56.249.243 'pm2 logs pix-backend'"
echo ""
