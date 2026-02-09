# 🔧 DEBUG - Page blanche admin

## ⚠️ ACTIONS CRITIQUES À FAIRE MAINTENANT

### 1. **VÉRIFIER ET METTRE À JOUR `.env`**

**C'est la cause #1 des timeouts !**

Ouvrez votre fichier **`.env`** et vérifiez que vous avez :

```env
DATABASE_URL="file:./dev.db?busy_timeout=10000"
```

**Sur le serveur en production (SSH) :**
```bash
cd /var/www/global  # ou votre dossier
nano .env  # ou vim .env

# Vérifiez que DATABASE_URL contient bien ?busy_timeout=10000
# Si c'est un chemin absolu :
DATABASE_URL="file:/var/www/global/prisma/dev.db?busy_timeout=10000"
```

### 2. **REDÉMARRER LE SERVEUR**

**En développement :**
```bash
# Ctrl+C pour arrêter
npm run dev
```

**En production avec PM2 :**
```bash
pm2 restart all
pm2 logs  # Vérifier les erreurs
```

### 3. **VÉRIFIER LES ADMINS**

Assurez-vous que votre Telegram ID est dans `bots/config.json` :

```bash
cat bots/config.json | grep ADMIN_TELEGRAM_IDS
```

Vous devriez voir votre ID (ex: `7832621973`).

---

## 🔍 DIAGNOSTIQUE - Si ça ne marche toujours pas

### Étape 1 : Vérifier les logs

**En dev :**
```bash
npm run dev
# Regardez la console
```

**En prod :**
```bash
pm2 logs --lines 50
```

Cherchez ces erreurs :
- ❌ `P1008` = timeout Prisma (DATABASE_URL mal configuré)
- ❌ `ECONNREFUSED` = serveur pas démarré
- ❌ `Invalid initData` = problème de validation Telegram

### Étape 2 : Tester l'accès direct

Dans votre navigateur, allez sur :
```
https://votre-site.com/administration/index.html
```

- ✅ Si ça s'ouvre : le problème vient de `/admin`
- ❌ Si page blanche : le problème vient du layout admin

### Étape 3 : Vérifier la base de données

```bash
# Vérifier que dev.db n'est pas verrouillé
lsof prisma/dev.db  # Linux/Mac
# ou
fuser prisma/dev.db  # Linux

# Si un processus bloque, le tuer :
kill -9 [PID]
```

### Étape 4 : Tester la connexion Prisma

Créez un fichier `test-db.js` :

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const count = await prisma.user.count();
    console.log('✅ DB OK, users:', count);
  } catch (error) {
    console.error('❌ DB ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
```

Exécutez :
```bash
node test-db.js
```

---

## 🚀 MODIFICATIONS FAITES

### 1. `/admin` - Redirection directe (pas de vérification)
- Plus de `fetch('/api/admin/verify')`
- Redirection immédiate vers `/administration`
- Sauvegarde de `initData` si disponible

### 2. Layout admin - Timeout de 5s
- Si on a `initData` : accès immédiat
- Sinon : vérification session avec timeout 5s
- En cas de timeout + initData : on laisse passer

### 3. `check-admin-access.ts` - Timeout DB de 3s
- Vérification config.json d'abord (rapide)
- Requête Prisma avec timeout de 3s
- En cas de timeout : refuse l'accès

---

## 📋 CHECKLIST COMPLÈTE

- [ ] `.env` contient `DATABASE_URL="file:./dev.db?busy_timeout=10000"`
- [ ] Serveur redémarré (`pm2 restart all` ou `npm run dev`)
- [ ] Votre Telegram ID est dans `bots/config.json`
- [ ] `pm2 logs` ne montre pas d'erreur P1008
- [ ] Le fichier `prisma/dev.db` existe et n'est pas verrouillé
- [ ] Vous pouvez accéder à `https://votre-site.com/administration/index.html`

---

## 🆘 SI ÇA NE MARCHE TOUJOURS PAS

### Option 1 : Bypass complet (temporaire)

Éditez `src/app/administration/src/layouts/main-layout/index.tsx` :

```typescript
useEffect(() => {
  // BYPASS TEMPORAIRE - À RETIRER APRÈS DEBUG
  setIsAuthenticated(true);
  setIsLoading(false);
}, []);
```

Puis testez si l'admin s'ouvre. Si oui, le problème vient de la vérification.

### Option 2 : Vider le cache

```bash
# Dev
rm -rf .next
npm run dev

# Prod
pm2 delete all
rm -rf .next
npm run build
pm2 start ecosystem.config.js
```

### Option 3 : Recréer la base de données

```bash
# ATTENTION : Cela supprime toutes les données !
rm prisma/dev.db
npx prisma migrate reset --force
npx prisma db seed
```

---

## 📞 INFORMATIONS À ME DONNER SI ÇA NE MARCHE PAS

1. Sortie de `pm2 logs` (les 20 dernières lignes)
2. Votre fichier `.env` (masquez les secrets) :
   ```bash
   cat .env | grep -E "DATABASE_URL|TELEGRAM_BOT_TOKEN|BOT_API_KEY"
   ```
3. Résultat de :
   ```bash
   node -e "const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.user.count().then(c => console.log('OK:', c)).catch(e => console.error('ERR:', e.message)).finally(() => p.$disconnect())"
   ```
4. Est-ce que `/administration/index.html` direct fonctionne ?
5. Navigateur utilisé (Chrome, Firefox, Safari, Telegram WebApp)

---

**Date :** 9 février 2026  
**Status :** En attente de test après modifications
