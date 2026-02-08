# 7Plugster — Mini App Telegram

Boutique en ligne intégrée à Telegram (WebApp + Bot).

## Déploiement depuis GitHub

### 1. Cloner
```bash
git clone <url-du-repo> word13
cd word13
```

### 2. Configurer (une seule fois)
```bash
npm install
npm run setup
```

Le script `setup` :
- Crée `.env` depuis `.env.example` si absent
- Crée `bots/config.json` depuis l'exemple si absent
- Configure le webhook Telegram
- Génère le client Prisma

**Note :** Le `.env` n'est plus écrasé lors du build. Modifiez `.env` directement (token, webhook secret, URLs) — vos changements restent.

### 4. Base de données
```bash
npx prisma migrate deploy
```

**Si erreur P3005** (base déjà existante) :
```bash
npx prisma migrate resolve --applied 20250202000000_add_subcategories
npx prisma migrate resolve --applied add_video_url
npx prisma migrate deploy
```

### 5. Build
```bash
npm run build
npm run build:admin
```

**Le build ne modifie jamais** : slider, produits, catégories, ni aucune donnée en base. Uniquement compilation du code.

### 6. Lancer
```bash
npm start
# ou avec PM2 :
pm2 start ecosystem.config.js
```

### Après chaque `git pull`
```bash
npm run deploy
npm run build
pm2 restart pizza
```

## Variables importantes (.env)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | URL publique du site (ex: https://xxx.7plugster.com) |
| `TELEGRAM_BOT_TOKEN` | Token du bot Telegram |
| `TELEGRAM_WEBHOOK_SECRET` | Secret pour sécuriser le webhook (min 16 caractères) |
| `NEXTAUTH_SECRET` | Secret NextAuth |
| `TELEGRAM_ONLY` | `true` = bloquer l'accès hors Telegram |

## Scripts utiles

- `npm run setup` — Configuration complète après clone
- `npm run deploy` — Créer .env/config si absent + configurer webhook
- `npm run webhook:set` — Configurer le webhook Telegram
