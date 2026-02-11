/**
 * Retourne les headers à envoyer pour les requêtes API protégées (type maisonp59).
 * - initData (hash vérifié côté serveur)
 * - X-Telegram-Platform (android | ios | weba…) pour restriction stricte Mobile App
 */
export function getTelegramFetchHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const tg = (window as any)?.Telegram?.WebApp;
  const initData = tg?.initData || sessionStorage.getItem('tgInitData') || localStorage.getItem('tgInitData');
  if (!initData) return {};
  const headers: HeadersInit = {
    Authorization: `tma ${initData}`,
    'X-Telegram-Init-Data': initData,
  };
  const platform = tg?.platform;
  if (platform && typeof platform === 'string') {
    (headers as Record<string, string>)['X-Telegram-Platform'] = platform;
  }
  return headers;
}

/** Retourne true si on a déjà l'initData (headers non vides). */
export function hasTelegramHeaders(): boolean {
  const h = getTelegramFetchHeaders() as Record<string, string>;
  return !!(h?.Authorization || h?.['X-Telegram-Init-Data']);
}

/**
 * Attend que l'initData soit disponible (Telegram.WebApp ou storage), puis resolve avec les headers.
 * Max waitMs (défaut 3000). Si timeout, resolve quand même avec les headers actuels (peut être vides).
 */
export function waitForTelegramHeaders(maxWaitMs = 3000): Promise<HeadersInit> {
  if (typeof window === 'undefined') return Promise.resolve({});
  const start = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      if (hasTelegramHeaders()) {
        resolve(getTelegramFetchHeaders());
        return;
      }
      if (Date.now() - start >= maxWaitMs) {
        resolve(getTelegramFetchHeaders());
        return;
      }
      setTimeout(check, 150);
    };
    check();
  });
}
