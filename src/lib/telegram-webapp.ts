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

  // Telegram docs: secret_key = HMAC_SHA256(bot_token, "WebAppData")
  const secretKey = crypto.createHmac('sha256', botToken).update('WebAppData').digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (hash && calculatedHash.toLowerCase() === hash.toLowerCase()) {
    const userStr = urlParams.get('user');
    return userStr ? JSON.parse(userStr) : null;
  }
  return null;
}
