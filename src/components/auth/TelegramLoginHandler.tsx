'use client';

import { useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';

// Définition des types pour Telegram WebApp
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe: any;
        ready: () => void;
        expand: () => void;
      }
    }
  }
}

export default function TelegramLoginHandler() {
  const { status, data: session } = useSession();

  useEffect(() => {
    if (status === 'loading') return;

    // Debug logs
    if (typeof window !== 'undefined') {
      console.log('Telegram WebApp disponible ?', !!window.Telegram?.WebApp);
      console.log('User data:', window.Telegram?.WebApp?.initDataUnsafe?.user);
      console.log('Init data:', window.Telegram?.WebApp?.initData);
    }

    // Vérifier si nous sommes dans Telegram WebApp
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const webApp = window.Telegram.WebApp;
      webApp.expand(); // Force l'expansion en plein écran
      const initData = webApp.initData;

      if (!initData) return;

      // Cas 1 : Utilisateur non connecté -> Tenter le login via Telegram
      if (status === 'unauthenticated') {
        console.log('Tentative de connexion via Telegram WebApp...');
        signIn('telegram-login', { 
          initData, 
          redirect: false 
        }).then((result) => {
           if (result?.ok) {
             console.log('Connexion Telegram réussie');
             window.location.reload();
           } else {
             console.warn('Échec de la connexion Telegram. L\'utilisateur n\'est peut-être pas lié.', result);
             // TODO: Rediriger vers login/register avec un message ?
           }
        }).catch(err => {
            console.error('Erreur lors de la connexion Telegram', err);
        });
      }
      
      // Cas 2 : Utilisateur connecté -> Tenter de lier le compte Telegram
      if (status === 'authenticated') {
        console.log('Utilisateur connecté, tentative de liaison Telegram...');
        fetch('/api/user/telegram', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ initData }),
        })
        .then(async (res) => {
          const data = await res.json();
          if (res.ok) {
            console.log('Compte Telegram lié avec succès !', data);
            // Optionnel : Notification de succès
          } else {
            console.warn('Erreur lors de la liaison Telegram :', data.error);
          }
        })
        .catch(err => console.error('Erreur appel API liaison :', err));
      }
    }
  }, [status, session]);

  return null;
}
