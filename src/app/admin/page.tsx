'use client'

import { useEffect } from 'react'

export default function AdminPage() {
  useEffect(() => {
    // REDIRECTION IMMÉDIATE SANS VÉRIFICATION
    try {
      const initData = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initData;
      
      if (initData) {
        sessionStorage.setItem('tgInitData', initData);
        localStorage.setItem('tgInitData', initData);
        window.location.replace(`/administration/index.html#/?tgWebAppData=${encodeURIComponent(initData)}`);
      } else {
        window.location.replace('/administration/index.html');
      }
    } catch {
      window.location.replace('/administration/index.html');
    }
  }, []);

  return null;
}
