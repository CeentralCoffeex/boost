/**
 * Utilitaires client pour Telegram WebApp (uniquement côté navigateur).
 */

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe: unknown;
        ready: () => void;
        expand: () => void;
      };
    };
  }
}

/** Vérifie si une chaîne ressemble à initData (query_id, user, auth_date, hash). */
function looksLikeInitData(s: string): boolean {
  return Boolean(s && s.includes('auth_date=') && (s.includes('user=') || s.includes('hash=')));
}

/** Récupère initData : Telegram.WebApp ou hash URL (#tgWebAppData= ou hash brut) ou query. */
export function getInitData(): string {
  if (typeof window === 'undefined') return '';
  const tg = window.Telegram?.WebApp;
  if (tg?.initData?.trim()) return tg.initData;
  const hashPart = window.location.hash?.slice(1) || '';
  if (hashPart) {
    const hp = new URLSearchParams(hashPart);
    const fromHash = hp.get('tgWebAppData');
    if (fromHash) return fromHash;
    // Fallback : hash brut = initData (Telegram peut passer directement query_id=...&user=...)
    if (looksLikeInitData(hashPart)) return hashPart;
    if (looksLikeInitData(decodeURIComponent(hashPart))) return decodeURIComponent(hashPart);
  }
  const qs = new URLSearchParams(window.location.search);
  const fromQuery = qs.get('tgWebAppData');
  if (fromQuery) return fromQuery;
  if (looksLikeInitData(window.location.search?.slice(1) || '')) return window.location.search.slice(1);
  return '';
}
