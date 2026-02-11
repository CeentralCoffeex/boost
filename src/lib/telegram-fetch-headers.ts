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
