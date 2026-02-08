'use client'

import { useEffect } from 'react'

export default function AdminPage() {
  useEffect(() => {
    // Récupérer initData depuis Telegram
    const initData = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initData;
    
    if (initData) {
      // Stocker pour que l'administration puisse l'utiliser
      try {
        sessionStorage.setItem('tgInitData', initData);
        localStorage.setItem('tgInitData', initData);
      } catch (e) {
        console.error('Failed to store initData:', e);
      }
      // Redirection vers administration avec initData en URL
      window.location.href = `/administration/index.html#/?tgWebAppData=${encodeURIComponent(initData)}`;
    } else {
      // Pas de Telegram, rediriger vers administration simple
      window.location.href = '/administration/index.html';
    }
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontSize: '18px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      Redirection...
    </div>
  )
}
