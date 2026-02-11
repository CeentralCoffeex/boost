# Parcours sécurité API (du plus simple au plus robuste)

**RÈGLE ABSOLUE : ne jamais enlever ni affaiblir la sécurité du site.** Toute modification (upload, API, proxy, auth) doit conserver ou renforcer les protections existantes. Les médias (images, vidéos) doivent toujours être servis via URLs signées (`/api/uploads/...?token=...&expires=...`), jamais en URL publique non protégée.

Ce document décrit les **5 étapes** pour passer d’une API exposée type « glo » à un niveau de protection type « maisonp59 ». Chaque étape s’ajoute à la précédente.

---

## Étape 1 — Activer Cloudflare Bot Fight + WAF

| Action sur glo | Code / Config |
|----------------|----------------|
| **Dashboard Cloudflare** → Security → Bots → **Bot Fight Mode ON** | Aucun code : configuration dans le dashboard Cloudflare du domaine. |
| **WAF** : créer une règle pour **challenge** (Managed Challenge ou JS Challenge) sur les chemins `*/api/*` | Exemple de règle : *If* `(http.request.uri.path contains "/api/")` *then* « Managed Challenge ». |

**Niveau de protection atteint :** Bloque le `curl` basique et une grande partie des bots non-navigateurs.

---

## Étape 2 — Ajouter la vérif initData Telegram (hash)

| Action sur glo | Code / Config |
|----------------|----------------|
| Vérifier côté serveur que le header `Authorization: tma <initData>` ou `X-Telegram-Init-Data` contient un **initData dont le hash HMAC est valide** avec le secret du bot. | **Fichiers :** `src/lib/telegram-webapp.ts` (validation hash), `src/lib/require-telegram-app.ts` (extraction + appel). Toutes les routes catalogue appellent `requireTelegramOrAdminOr403(request, checkAdminAccess)`. |
| Le client envoie l’initData (fourni par `Telegram.WebApp.initData`) dans chaque requête API. | **Fichier :** `src/lib/telegram-fetch-headers.ts` → `getTelegramFetchHeaders()` (utilisé par page, MenuBar, ProductDetail, etc.). |

**Niveau de protection atteint :** Bloque tout accès sans **vrai** contexte Telegram (initData signé par Telegram). User-Agent / Origin / Referer seuls ne suffisent pas.

---

## Étape 3 — Ajouter le check mobile-only

| Action sur glo | Code / Config |
|----------------|----------------|
| Dans le **route handler** (ou middleware), exiger en plus de l’initData valide un indicateur de plateforme **mobile** (Android/iOS). | **Fichier :** `src/lib/require-telegram-app.ts` → après validation du hash, lecture du header `X-Telegram-Platform` ; si `STRICT_TELEGRAM_MOBILE_APP` est actif, n’accepter que `android` ou `ios`. |
| Le client envoie la plateforme (ex. `Telegram.WebApp.platform`) dans un header dédié. | **Fichier :** `src/lib/telegram-fetch-headers.ts` → envoi de `X-Telegram-Platform: <platform>`. |
| Variable d’environnement pour activer/désactiver : | **`.env`** : `STRICT_TELEGRAM_MOBILE_APP=true` (défaut). Mettre `false` pour autoriser aussi Telegram Desktop (weba). |

**Niveau de protection atteint :** Bloque l’accès depuis **Telegram Desktop** (weba) et depuis tout client qui n’envoie pas une plateforme mobile valide (ex. curl, scripts).

---

## Étape 4 — Utiliser des signed URLs pour les vidéos (médias non publics)

| Action sur glo | Code / Config |
|----------------|----------------|
| Ne pas servir les médias (vidéos/images uploadées) via une URL publique fixe. Générer des **URLs signées** à durée limitée. | **Fichiers :** `src/lib/upload-sign.ts` (création/vérification token HMAC), `src/app/api/uploads/[...path]/route.ts` et `[filename]/route.ts` : lecture de `?token=&expires=` et refus (403) si invalide ou absent. |
| Les réponses API (produits, catégories, slider) renvoient déjà des URLs signées pour `image` et `videoUrl` pointant vers `/api/uploads/...`. | **Fichiers :** `signUploadUrl`, `signProductUrls`, `signCategoryProducts` dans `upload-sign.ts` ; utilisés dans les routes `products`, `categories`, `slider`. |
| **Option production :** stocker les fichiers sur **Cloudflare R2** (ou S3) et générer des **signed URLs** côté serveur (même principe : token + expiration). | Config hébergeur + adaptation de `upload-sign` / route uploads pour appeler l’API R2/S3 signed URL. |

**Niveau de protection atteint :** Les **médias ne sont plus publics** : sans URL signée valide (générée après auth Telegram), pas d’accès direct aux vidéos/images.

---

## Étape 5 — Rate limiting + CSP renforcé

| Action sur glo | Code / Config |
|----------------|----------------|
| **Rate limiting** sur `/api/*` pour limiter le débit par IP (anti-scraping). | **Option A (Cloudflare) :** Dashboard → Security → WAF → Rate limiting (ex. 10 req/min par IP sur `*/api/*`). **Option B (appliqué dans ce repo) :** `src/proxy.ts` → 10 req/min par IP sur `/api/*` (hors auth, webhook, uploads). Variable `API_RATE_LIMIT_PER_MIN` dans `.env`. |
| **CSP renforcé** (anti-XSS, contrôle des sources de script/requêtes). | **next.config.js** : `headers()` applique déjà des en-têtes de sécurité (X-Frame-Options, HSTS, X-Content-Type-Options, Referrer-Policy). Pour la zone `/administration` une CSP stricte est définie. Pour le reste du site, on peut ajouter une CSP globale dans le même `headers()` si besoin (ex. `default-src 'self'; script-src 'self' https://telegram.org; ...`). |

**Niveau de protection atteint :** **Anti-scraping** (rate limit) + **anti-XSS** et contrôle des ressources (CSP).

---

## Blocage accès PC (TELEGRAM_ONLY / BLOCK_PC_ACCESS)

| Action | Code / Config |
|--------|----------------|
| Quand `TELEGRAM_ONLY=true` ou `BLOCK_PC_ACCESS=true`, **tout le site** est bloqué depuis un navigateur PC (User-Agent sans Telegram/Android/iPhone/iPad). | **Fichier :** `src/proxy.ts` — détection User-Agent, exception uniquement pour `/api/telegram/webhook` (appelé par les serveurs Telegram). |
| **Pages** : réponse 403 + page HTML « Ouvrez depuis l’application Telegram ». | Même proxy. |
| **API** (`/api/products`, `/api/categories`, `/api/settings`, etc.) : réponse 403 JSON `{ error: 'BOT_DETECTED', message: '...' }`. | Aucune donnée API n’est servie depuis un PC. |
| En plus, chaque route API catalogue exige **initData valide** (hash HMAC) ou **session admin**. | Voir étape 2 ; routes dans `src/app/api/*` utilisent `requireTelegramOrAdminOr403(request, checkAdminAccess)`. |

**Résultat :** Depuis un PC, impossible d’accéder aux pages ni aux données API (produits, catégories, settings, etc.). Seul le webhook Telegram reste accessible pour que le bot fonctionne.

---

## Récapitulatif

| Étape | Protection principale |
|-------|------------------------|
| 1 | Bloque curl / bots simples (CF Bot Fight + WAF) |
| 2 | Bloque sans vrai Telegram (initData hash) |
| 3 | Bloque depuis desktop / curl (mobile-only) |
| 4 | Médias non publics (signed URLs, option R2) |
| 5 | Anti-scraping + anti-XSS (rate limit + CSP) |
| **PC** | **Blocage total site + API depuis PC** (sauf webhook) |

Dans ce dépôt, les **étapes 2, 3, 4 et 5 (rate limit)** et le **blocage PC total** sont déjà implémentés. Il reste à **activer l’étape 1** dans le dashboard Cloudflare et, en production, à envisager **R2 + signed URLs** (étape 4) et **CSP globale** (étape 5) si vous souhaitez durcir encore la politique des contenus.
