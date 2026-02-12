import crypto from 'crypto';

const DEFAULT_TTL_SEC = 60 * 60 * 24 * 7; // 7 jours pour photos/vidéos

function getSecret(): string {
  const secret = process.env.UPLOADS_SIGNING_SECRET || process.env.TELEGRAM_BOT_TOKEN;
  if (!secret) throw new Error('UPLOADS_SIGNING_SECRET or TELEGRAM_BOT_TOKEN required for signed uploads');
  return secret;
}

/**
 * Génère un token signé pour un chemin d'upload. À ajouter en query (token, expires).
 */
export function createSignedToken(path: string, ttlSec: number = DEFAULT_TTL_SEC): { token: string; expires: number } {
  const expires = Math.floor(Date.now() / 1000) + ttlSec;
  const payload = `${path}|${expires}`;
  const secret = getSecret();
  const token = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return { token, expires };
}

/**
 * Vérifie token + expires pour un chemin. Retourne true si valide.
 */
export function verifySignedToken(path: string, token: string, expiresStr: string): boolean {
  const expires = parseInt(expiresStr, 10);
  if (!Number.isFinite(expires) || Date.now() / 1000 > expires) return false;
  const payload = `${path}|${expires}`;
  const secret = getSecret();
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(token, 'hex'));
}

/**
 * Si url est un chemin /api/uploads/xxx, retourne la même URL avec ?token=...&expires=...
 * Sinon retourne url inchangé (URLs externes).
 */
export function signUploadUrl(url: string | null | undefined, ttlSec?: number): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  // Extraire le chemin sans query (évite double signature path?token=...)
  const withoutQuery = trimmed.split('?')[0].trim();
  const match = withoutQuery.match(/^\/api\/uploads\/(.+)$/);
  if (!match) return trimmed; // externe ou déjà signée
  const path = match[1];
  const { token, expires } = createSignedToken(path, ttlSec);
  const base = withoutQuery;
  return `${base}?token=${encodeURIComponent(token)}&expires=${expires}`;
}

/** Signe image et videoUrl d'un objet produit/catégorie pour l'API. */
export function signProductUrls<T extends { image?: string | null; videoUrl?: string | null }>(item: T, ttlSec?: number): T {
  const out = { ...item } as T;
  if (item.image) (out as any).image = signUploadUrl(item.image, ttlSec) ?? item.image;
  if (item.videoUrl) (out as any).videoUrl = signUploadUrl(item.videoUrl, ttlSec) ?? item.videoUrl;
  return out;
}

/** Signe les URLs d'upload dans une liste de produits (image, videoUrl). */
export function signProductsUrls<T extends { image?: string | null; videoUrl?: string | null }>(items: T[], ttlSec?: number): T[] {
  return items.map((item) => signProductUrls(item, ttlSec));
}

/** Signe l'icône (et image si présent) d'une catégorie pour affichage. */
export function signCategoryIcon<T extends { icon?: string | null; image?: string | null }>(cat: T, ttlSec?: number): T {
  const out = { ...cat } as T;
  if (cat.icon) (out as any).icon = signUploadUrl(cat.icon, ttlSec) ?? cat.icon;
  if (cat.image) (out as any).image = signUploadUrl(cat.image, ttlSec) ?? cat.image;
  return out;
}

/** Signe les icônes d'une liste de catégories. */
export function signCategoriesIcons<T extends { icon?: string | null; image?: string | null }[]>(categories: T, ttlSec?: number): T {
  return categories.map((c) => signCategoryIcon(c, ttlSec)) as T;
}

/** Signe image/videoUrl des produits d'une catégorie (réponse API categories). */
export function signCategoryProducts<T extends { icon?: string | null; image?: string | null; products?: { image?: string | null; videoUrl?: string | null }[] }>(cat: T, ttlSec?: number): T {
  let out = signCategoryIcon(cat, ttlSec) as T;
  if (out.products?.length) out = { ...out, products: signProductsUrls(out.products, ttlSec) } as T;
  return out;
}
