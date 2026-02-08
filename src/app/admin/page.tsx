'use client'

import { useEffect, useState } from 'react'

export default function AdminPage() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAndRedirect = async () => {
      try {
        // Récupérer initData depuis Telegram
        const initData = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initData;
        
        const headers: Record<string, string> = { 'Cache-Control': 'no-cache' };
        if (initData) {
          headers['Authorization'] = `tma ${initData}`;
          headers['X-Telegram-Init-Data'] = initData;
        }

        // Vérifier si admin AVANT de rediriger
        const response = await fetch('/api/admin/verify', {
          credentials: 'include',
          cache: 'no-store',
          headers,
        });
        
        const data = await response.json();
        
        if (!data.allowed) {
          // Non autorisé : retour à l'accueil
          window.location.href = '/';
          return;
        }

        // Admin vérifié : rediriger vers administration
        if (initData) {
          try {
            sessionStorage.setItem('tgInitData', initData);
            localStorage.setItem('tgInitData', initData);
          } catch (e) {
            console.error('Failed to store initData:', e);
          }
          window.location.href = `/administration/index.html#/?tgWebAppData=${encodeURIComponent(initData)}`;
        } else {
          window.location.href = '/administration/index.html';
        }
      } catch (error) {
        console.error('Admin check failed:', error);
        // En cas d'erreur : retour accueil
        window.location.href = '/';
      }
    };

    checkAndRedirect();
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontSize: '18px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: 'white'
    }}>
      {checking && 'Vérification...'}
    </div>
  )
}
