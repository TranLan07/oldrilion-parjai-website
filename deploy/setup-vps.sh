#!/bin/bash
# ============================================================
# Parjai Web — Script d'installation VPS Debian 12
# À exécuter en root sur le VPS : bash setup-vps.sh
# ============================================================

set -e

DOMAIN="parjai.fr"
APP_DIR="/var/www/parjai"
REPO_URL="https://github.com/TranLan07/oldrilion-parjai-website.git"

echo "=== [1/7] Mise à jour du système ==="
apt update && apt upgrade -y

echo "=== [2/7] Installation de Node.js 22 LTS ==="
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs git build-essential

echo "Node $(node -v) / npm $(npm -v)"

echo "=== [3/7] Installation de PM2 ==="
npm install -g pm2

echo "=== [4/7] Installation de Nginx + Certbot ==="
apt install -y nginx certbot python3-certbot-nginx
systemctl enable nginx

echo "=== [5/7] Clone du projet ==="
mkdir -p /var/www
if [ -d "$APP_DIR" ]; then
  echo "Le dossier $APP_DIR existe déjà, on pull..."
  cd "$APP_DIR" && git pull
else
  git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

echo "=== [6/7] Configuration ==="
if [ ! -f .env ]; then
  cp .env.example .env
  # Générer un secret aléatoire
  AUTH_SECRET=$(openssl rand -base64 32)
  sed -i "s|CHANGE-ME-GENERATE-A-RANDOM-STRING|$AUTH_SECRET|" .env
  echo "⚠  Édite /var/www/parjai/.env pour configurer la BDD et le SMTP"
fi

echo "=== [7/7] Build ==="
npm ci
npx prisma generate
npx prisma db push
npm run build

echo ""
echo "✅ Installation terminée !"
echo ""
echo "Prochaines étapes :"
echo "  1. Édite /var/www/parjai/.env si besoin"
echo "  2. Lance le seed : cd /var/www/parjai && node --import tsx/esm prisma/seed.ts"
echo "  3. Configure nginx : cp deploy/nginx.conf /etc/nginx/sites-available/parjai"
echo "  4. Active le site : ln -sf /etc/nginx/sites-available/parjai /etc/nginx/sites-enabled/"
echo "  5. Supprime le default : rm -f /etc/nginx/sites-enabled/default"
echo "  6. Teste nginx : nginx -t && systemctl reload nginx"
echo "  7. SSL : certbot --nginx -d parjai.fr -d www.parjai.fr"
echo "  8. Démarre l'app : pm2 start deploy/ecosystem.config.cjs && pm2 save && pm2 startup"
