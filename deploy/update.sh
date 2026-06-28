#!/bin/bash
# Script de mise à jour — à lancer sur le VPS après un git push
set -e
cd /var/www/parjai

echo "=== Pull des changements ==="
git pull

echo "=== Installation des dépendances ==="
npm ci

echo "=== Génération Prisma + migration ==="
npx prisma generate
npx prisma db push

echo "=== Build ==="
npm run build

echo "=== Redémarrage ==="
pm2 restart parjai

echo "✅ Mise à jour terminée !"
