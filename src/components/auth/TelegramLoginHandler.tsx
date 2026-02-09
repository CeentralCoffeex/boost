'use client';

import { useEffect, useRef, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { getInitData } from '@/lib/telegram-client';

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
    const id = getInitData();
    setInitDataReady(!!id);
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
