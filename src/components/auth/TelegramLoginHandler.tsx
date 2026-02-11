'use client';

import { useEffect, useRef, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { getInitData } from '@/lib/telegram-client';

/** Retry pour laisser le temps à Telegram.WebApp de charger (initData). */
const RETRY_DELAYS_MS = [0, 200, 500, 1000];

/**
 * Connexion automatique Telegram : dès qu'on ouvre la Mini App depuis le bot,
 * on récupère initData et on se connecte via NextAuth (CredentialsProvider telegram-login).
 * On utilise uniquement signIn() (GET/redirect) pour éviter l'erreur "HTTP POST is not supported".
 */
export default function TelegramLoginHandler() {
  const { status } = useSession();
  const triedRef = useRef(false);
  const [initDataReady, setInitDataReady] = useState(false);

  useEffect(() => {
    let attempt = 0;
    function check() {
      const id = getInitData();
      if (id) {
        setInitDataReady(true);
        return;
      }
      attempt++;
      if (attempt < RETRY_DELAYS_MS.length) {
        setTimeout(check, RETRY_DELAYS_MS[attempt]);
      }
    }
    check();
  }, []);

  useEffect(() => {
    if (status === 'loading' || !initDataReady) return;
    const initData = getInitData();
    if (!initData) return;

    window.Telegram?.WebApp?.expand?.();

    if (status === 'unauthenticated' && !triedRef.current) {
      triedRef.current = true;
      signIn('telegram-login', { initData, redirect: true, callbackUrl: window.location.pathname || '/' });
    }
  }, [status, initDataReady]);

  return null;
}
