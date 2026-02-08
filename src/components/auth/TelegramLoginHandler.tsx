'use client';

import { useEffect, useRef, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { getInitData } from '@/lib/telegram-client';

/**
 * Connexion automatique Telegram : dès qu'on ouvre la Mini App depuis le bot,
 * on récupère initData et on se connecte via NextAuth (CredentialsProvider telegram-login).
 */
export default function TelegramLoginHandler() {
  const { status } = useSession();
  const triedRef = useRef(false);
  const [initDataReady, setInitDataReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 60;
    const check = () => {
      if (cancelled || attempts++ > maxAttempts) return;
      const id = getInitData();
      if (id) {
        setInitDataReady(true);
        return;
      }
      (window as Window & { Telegram?: { WebApp?: { ready: () => void } } }).Telegram?.WebApp?.ready?.();
      setTimeout(check, 150);
    };
    const t = setTimeout(check, 50);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  const doSignIn = (initData: string) => {
    if (triedRef.current) return;
    triedRef.current = true;
    const inTg = !!(typeof window !== 'undefined' && (window as Window & { Telegram?: { WebApp?: unknown } }).Telegram?.WebApp);
    if (inTg) {
      fetch('/api/auth/csrf', { credentials: 'include' })
        .then((r) => r.json())
        .then((d) => d?.csrfToken || '')
        .then((csrf) => {
          const f = document.createElement('form');
          f.method = 'POST';
          f.action = '/api/auth/callback/credentials';
          f.style.display = 'none';
          [
            ['csrfToken', csrf],
            ['callbackUrl', window.location.pathname || '/'],
            ['json', 'true'],
            ['initData', initData],
          ].forEach(([k, v]) => {
            const i = document.createElement('input');
            i.name = k;
            i.value = String(v);
            i.type = 'hidden';
            f.appendChild(i);
          });
          document.body.appendChild(f);
          f.submit();
        })
        .catch(() => {
          triedRef.current = false;
          signIn('telegram-login', { initData, redirect: true });
        });
    } else {
      signIn('telegram-login', { initData, redirect: true });
    }
  };

  useEffect(() => {
    if (status === 'loading' || !initDataReady) return;
    const initData = getInitData();
    if (!initData) return;

    window.Telegram?.WebApp?.expand?.();

    if (status === 'unauthenticated') {
      doSignIn(initData);
    }
  }, [status, initDataReady]);

  return null;
}
