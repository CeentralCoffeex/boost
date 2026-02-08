'use client';

import { useEffect, useRef, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { getInitData } from '@/lib/telegram-client';

export default function TelegramLoginHandler() {
  const { status } = useSession();
  const triedRef = useRef(false);
  const [initDataReady, setInitDataReady] = useState(false);

  // Attendre que initData soit disponible (script Telegram peut charger en retard)
  useEffect(() => {
    let cancelled = false;
    const check = () => {
      if (cancelled) return;
      const id = getInitData();
      if (id) {
        setInitDataReady(true);
        return;
      }
      (window as Window & { Telegram?: { WebApp?: { ready: () => void } } }).Telegram?.WebApp?.ready?.();
      setTimeout(check, 200);
    };
    const t = setTimeout(check, 100);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (status === 'loading' || !initDataReady) return;

    const initData = getInitData();
    if (!initData) return;

    window.Telegram?.WebApp?.expand?.();

    if (status === 'unauthenticated') {
      if (triedRef.current) return;
      triedRef.current = true;
      signIn('telegram-login', { initData, redirect: false })
        .then((r) => {
          if (r?.ok) window.location.reload();
        })
        .catch(() => { triedRef.current = false; });
    } else if (status === 'authenticated') {
      fetch('/api/user/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ initData }),
      }).catch(() => {});
    }
  }, [status, initDataReady]);

  return null;
}
