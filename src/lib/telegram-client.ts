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

/** Récupère initData : Telegram.WebApp ou hash URL (#tgWebAppData=) ou query (?tgWebAppData=). */
export function getInitData(): string {
  if (typeof window === 'undefined') return '';
  const tg = window.Telegram?.WebApp;
  if (tg?.initData?.trim()) return tg.initData;
  const hashPart = window.location.hash?.slice(1) || '';
  if (hashPart) {
    const hp = new URLSearchParams(hashPart);
    const fromHash = hp.get('tgWebAppData');
    if (fromHash) return fromHash;
  }
  const qs = new URLSearchParams(window.location.search);
  return qs.get('tgWebAppData') || '';
}
