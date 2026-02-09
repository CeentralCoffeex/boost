'use client'

import { useEffect } from 'react'

export default function AdminPage() {
  useEffect(() => {
    const checkAndRedirect = async () => {
      try {
        // Attendre un peu pour que Telegram WebApp soit prêt
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Récupérer initData depuis Telegram
        const initData = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initData;
        
        const headers: Record<string, string> = { 
          'Cache-Control': 'no-cache',
          'X-Admin-Route': 'true'
        };
        if (initData) {
          headers['Authorization'] = `tma ${initData}`;
          headers['X-Telegram-Init-Data'] = initData;
        }

        // Vérifier si admin (timeout de 10s)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch('/api/admin/verify', {
          credentials: 'include',
          cache: 'no-store',
          headers,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
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
      } catch (error: any) {
        console.error('Admin check failed:', error);
        // En cas d'erreur, retenter après 1 seconde
        setTimeout(() => window.location.reload(), 1000);
      }
    };

    checkAndRedirect();
  }, []);

  // Page invisible pendant la vérification
  return null;
}
