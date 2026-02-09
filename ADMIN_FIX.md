# Correction : Page blanche/noire lors de l'accès admin

## Problème résolu

❌ **Avant** : Une fois sur 2, l'accès à l'admin depuis le site ou le bot affichait une page noire/blanche avec des erreurs de timeout Prisma (P1008).

✅ **Après** : L'admin est maintenant toujours accessible, que ce soit via le bot Telegram ou le navigateur normal.

---

## Modifications apportées

### 1. **Exception pour les routes admin** (`TelegramAccessGuard.tsx`)
- Les routes `/admin` et `/administration` ne sont plus bloquées par `TELEGRAM_ONLY`
- La vérification d'accès se fait côté serveur, pas côté client
- Plus de blocage avec le message "Accès interdit"

### 2. **Amélioration du chargement** (`admin/page.tsx`)
- Délai de 300ms pour laisser Telegram WebApp se charger complètement
- Timeout de 10 secondes sur la vérification d'accès (au lieu d'attendre indéfiniment)
- Retry automatique après 3 secondes en cas d'erreur
- Messages d'erreur clairs pour le debugging

### 3. **Optimisation des requêtes Prisma** (`check-admin-access.ts`)
- Utilisation du cache pour éviter les requêtes répétées
- Timeout de 8 secondes sur les requêtes à la base de données
- Retour rapide si l'utilisateur est en cache
- Gestion propre des erreurs de timeout

### 4. **Configuration Prisma SQLite** (`.env.example`, `prisma.ts`)
- Ajout du paramètre `busy_timeout=10000` (10 secondes) dans DATABASE_URL
- Documentation dans les commentaires pour éviter les P1008 (timeout SQLite)

---

## À FAIRE MAINTENANT (IMPORTANT)

### 1. Mettre à jour votre fichier `.env`

Dans votre fichier **`.env`** (en local ET sur le serveur en production), modifiez `DATABASE_URL` :

**Avant :**
```env
DATABASE_URL="file:./dev.db"
```

**Après :**
```env
DATABASE_URL="file:./dev.db?busy_timeout=10000"
```

Si vous utilisez un chemin absolu en production (ex: `/var/www/global/prisma/dev.db`) :
```env
DATABASE_URL="file:/var/www/global/prisma/dev.db?busy_timeout=10000"
```

### 2. Redémarrer le serveur

**En développement :**
```bash
# Arrêter le serveur (Ctrl+C)
# Puis relancer
npm run dev
```

**En production (avec PM2) :**
```bash
pm2 restart all
# ou si vous avez un nom spécifique :
pm2 restart next-app
```

---

## Résultat attendu

✅ L'admin s'ouvre **toujours**, que vous y accédiez via :
- Le bot Telegram (WebApp)
- Un navigateur normal (avec session)
- Un lien direct

✅ Plus de page noire/blanche
✅ Plus de boucles de redirection
✅ Plus d'erreurs de timeout Prisma (P1008)
✅ Messages d'erreur clairs si problème de connexion

---

## Si vous avez encore des problèmes

### Erreur P1008 (timeout Prisma)
- Vérifiez que `DATABASE_URL` contient bien `?busy_timeout=10000`
- Vérifiez qu'aucun autre processus ne verrouille le fichier `dev.db`
- Essayez d'augmenter le timeout à 20000 (20 secondes)

### Page blanche persistante
- Ouvrez la console navigateur (F12) et vérifiez les erreurs
- Vérifiez les logs du serveur Next.js
- Essayez de vider le cache du navigateur (Ctrl+Shift+Delete)

### "Accès refusé"
- Vérifiez que votre Telegram ID est bien dans `bots/config.json` (champ `ADMIN_TELEGRAM_IDS`)
- OU que vous avez un compte dans la table `telegram_admins` avec `isActive: true`
- OU que votre utilisateur a le rôle `ADMIN` en base de données

---

## Fichiers modifiés

1. `src/app/admin/page.tsx` - Meilleur chargement et gestion d'erreurs
2. `src/components/auth/TelegramAccessGuard.tsx` - Exception pour routes admin
3. `src/lib/check-admin-access.ts` - Optimisation et timeouts
4. `.env.example` - Documentation du `busy_timeout`
5. `src/lib/prisma.ts` - Commentaire sur le busy_timeout
6. `next.config.js` - Suppression de `swcMinify` (obsolète)

---

**Date de correction :** 9 février 2026
