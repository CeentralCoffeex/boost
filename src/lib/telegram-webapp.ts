import crypto from 'crypto';

/**
 * Valide les données Telegram WebApp et retourne l'objet user ou null.
 */
export function validateTelegramWebAppData(
  initData: string,
  botToken: string
): { id: number; first_name: string; last_name?: string; username?: string; photo_url?: string } | null {
  if (!initData || !botToken) return null;

  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');

  const dataCheckString = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  // Comparaison à temps constant pour éviter les attaques par analyse temporelle (side-channel)
  if (hash) {
    const a = Buffer.from(calculatedHash.toLowerCase(), 'hex');
    const b = Buffer.from(hash.toLowerCase(), 'hex');
    if (a.length === 32 && b.length === 32 && crypto.timingSafeEqual(a, b)) {
      const userStr = urlParams.get('user');
      return userStr ? JSON.parse(userStr) : null;
    }
  }
  return null;
}
