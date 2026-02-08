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
      const doLink = (attempt = 0) => {
        fetch('/api/user/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ initData }),
        })
          .then(async (res) => {
            const data = await res.json().catch(() => ({}));
            if (res.ok && data?.success) {
              window.dispatchEvent(new CustomEvent('telegram-linked', { detail: data }));
            } else if (res.status >= 500 && attempt < 2) {
              setTimeout(() => doLink(attempt + 1), 1500);
            }
          })
          .catch(() => {
            if (attempt < 2) setTimeout(() => doLink(attempt + 1), 1500);
          });
      };
      doLink();
    }
  }, [status, initDataReady]);

  return null;
}
