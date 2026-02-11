import crypto from 'crypto';

const DEFAULT_TTL_SEC = 60 * 60; // 1h

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
  const match = trimmed.match(/^\/api\/uploads\/(.+)$/);
  if (!match) return trimmed; // externe ou déjà signée
  const path = match[1];
  const { token, expires } = createSignedToken(path, ttlSec);
  const sep = trimmed.includes('?') ? '&' : '?';
  return `${trimmed}${sep}token=${encodeURIComponent(token)}&expires=${expires}`;
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

/** Signe image/videoUrl des produits d'une catégorie (réponse API categories). */
export function signCategoryProducts<T extends { products?: { image?: string | null; videoUrl?: string | null }[] }>(cat: T, ttlSec?: number): T {
  if (!cat.products?.length) return cat;
  return { ...cat, products: signProductsUrls(cat.products, ttlSec) } as T;
}
