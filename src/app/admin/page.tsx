'use client'

import { useEffect, useState } from 'react'

export default function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkAndRedirect = async () => {
      try {
        // Attendre un peu pour que Telegram WebApp soit prêt
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Récupérer initData depuis Telegram
        const initData = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initData;
        
        const headers: Record<string, string> = { 
          'Cache-Control': 'no-cache',
          'X-Admin-Route': 'true' // Indique qu'on vient d'une route admin
        };
        if (initData) {
          headers['Authorization'] = `tma ${initData}`;
          headers['X-Telegram-Init-Data'] = initData;
        }

        // Vérifier si admin AVANT de rediriger (timeout de 10s)
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
          setError('Accès refusé - vous n\'êtes pas administrateur');
          setTimeout(() => window.location.href = '/', 2000);
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
        if (error?.name === 'AbortError') {
          setError('Timeout - la base de données met trop de temps à répondre');
        } else {
          setError('Erreur de vérification - veuillez réessayer');
        }
        // Attendre 3s puis retenter automatiquement
        setTimeout(() => window.location.reload(), 3000);
      }
    };

    checkAndRedirect();
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontSize: '18px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: 'white',
      padding: '20px',
      textAlign: 'center'
    }}>
      {error ? (
        <>
          <div style={{ color: '#ef4444', marginBottom: '10px' }}>⚠️ {error}</div>
          <div style={{ fontSize: '14px', color: '#666' }}>Nouvelle tentative dans 3 secondes...</div>
        </>
      ) : (
        checking && 'Vérification de vos droits administrateur...'
      )}
    </div>
  )
}
