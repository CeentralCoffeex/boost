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

/** Récupère initData : Telegram.WebApp ou hash URL (#tgWebAppData= ou hash brut) ou query ou storage. */
export function getInitData(): string {
  if (typeof window === 'undefined') return '';
  
  // 1. Telegram.WebApp.initData (source principale)
  const tg = window.Telegram?.WebApp;
  if (tg?.initData?.trim()) {
    // Sauvegarder dans storage pour réutilisation
    try {
      sessionStorage.setItem('tgInitData', tg.initData);
      localStorage.setItem('tgInitData', tg.initData);
    } catch {}
    return tg.initData;
  }
  
  // 2. Hash URL (#tgWebAppData= ou hash brut)
  const hashPart = window.location.hash?.slice(1) || '';
  if (hashPart) {
    const hp = new URLSearchParams(hashPart);
    const fromHash = hp.get('tgWebAppData');
    if (fromHash) {
      try {
        sessionStorage.setItem('tgInitData', fromHash);
        localStorage.setItem('tgInitData', fromHash);
      } catch {}
      return fromHash;
    }
    // Fallback : hash brut = initData (Telegram peut passer directement query_id=...&user=...)
    if (looksLikeInitData(hashPart)) {
      try {
        sessionStorage.setItem('tgInitData', hashPart);
        localStorage.setItem('tgInitData', hashPart);
      } catch {}
      return hashPart;
    }
    const decoded = decodeURIComponent(hashPart);
    if (looksLikeInitData(decoded)) {
      try {
        sessionStorage.setItem('tgInitData', decoded);
        localStorage.setItem('tgInitData', decoded);
      } catch {}
      return decoded;
    }
  }
  
  // 3. Query string (?tgWebAppData=)
  const qs = new URLSearchParams(window.location.search);
  const fromQuery = qs.get('tgWebAppData');
  if (fromQuery) {
    try {
      sessionStorage.setItem('tgInitData', fromQuery);
      localStorage.setItem('tgInitData', fromQuery);
    } catch {}
    return fromQuery;
  }
  if (looksLikeInitData(window.location.search?.slice(1) || '')) {
    const initDataFromSearch = window.location.search.slice(1);
    try {
      sessionStorage.setItem('tgInitData', initDataFromSearch);
      localStorage.setItem('tgInitData', initDataFromSearch);
    } catch {}
    return initDataFromSearch;
  }
  
  // 4. Fallback : vérifier sessionStorage/localStorage (si déjà sauvegardé)
  try {
    const stored = sessionStorage.getItem('tgInitData') || localStorage.getItem('tgInitData');
    if (stored && looksLikeInitData(stored)) {
      return stored;
    }
  } catch {}
  
  return '';
}
