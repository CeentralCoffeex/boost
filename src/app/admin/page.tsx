'use client'

import { useEffect } from 'react'

export default function AdminPage() {
  useEffect(() => {
    // Redirection DIRECTE sans vérification - la vérification se fera dans /administration
    const redirect = () => {
      try {
        // Récupérer initData depuis Telegram
        const initData = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initData;
        
        // Sauvegarder initData si disponible
        if (initData) {
          try {
            sessionStorage.setItem('tgInitData', initData);
            localStorage.setItem('tgInitData', initData);
          } catch (e) {
            console.error('Failed to store initData:', e);
          }
          // Rediriger avec initData
          window.location.href = `/administration/index.html#/?tgWebAppData=${encodeURIComponent(initData)}`;
        } else {
          // Rediriger sans initData
          window.location.href = '/administration/index.html';
        }
      } catch (error) {
        console.error('Redirect failed:', error);
        window.location.href = '/administration/index.html';
      }
    };

    // Petit délai pour Telegram WebApp
    setTimeout(redirect, 200);
  }, []);

  return null;
}
