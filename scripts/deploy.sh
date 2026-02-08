#!/bin/bash
# À exécuter après git clone/pull sur le serveur
# Usage: ./scripts/deploy.sh  ou  bash scripts/deploy.sh

set -e
cd "$(dirname "$0")/.."

echo "📦 Déploiement..."

# Configurer le webhook Telegram
echo "📤 Configuration du webhook Telegram..."
node scripts/set-telegram-webhook.js

echo ""
echo "✅ Terminé. Ensuite : npm run build && pm2 restart pizza (ou npm start)"
