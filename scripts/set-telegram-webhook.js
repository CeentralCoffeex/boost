#!/usr/bin/env node
/**
 * Configure le webhook Telegram avec le secret_token.
 * Usage: node scripts/set-telegram-webhook.js
 * Nécessite: TELEGRAM_BOT_TOKEN et TELEGRAM_WEBHOOK_SECRET dans .env
 */
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ Fichier .env introuvable. Créez-le à partir de .env.example');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    const m = trimmed.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const token = env.TELEGRAM_BOT_TOKEN;
  const secret = env.TELEGRAM_WEBHOOK_SECRET;
  const baseUrl = env.NEXT_PUBLIC_APP_URL || env.NEXTAUTH_URL || 'https://votre-domaine.com';

  if (!token) {
    console.error('❌ TELEGRAM_BOT_TOKEN manquant dans .env');
    process.exit(1);
  }
  if (!secret || secret.length < 16) {
    console.error('❌ TELEGRAM_WEBHOOK_SECRET manquant ou trop court (min 16 caractères)');
    process.exit(1);
  }

  const webhookUrl = `${baseUrl.replace(/\/$/, '')}/api/telegram/webhook`;
  console.log('📤 Configuration du webhook Telegram...');
  console.log('   URL:', webhookUrl);

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl, secret_token: secret }),
  });

  const data = await res.json();
  if (data.ok) {
    console.log('✅ Webhook configuré avec succès');
  } else {
    console.error('❌ Erreur:', data.description || data);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
