'use client';

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { getInitData } from '@/lib/telegram-client';
import { getTelegramFetchHeaders } from '@/lib/telegram-fetch-headers';

export interface TelegramInfo {
  linked: boolean;
  telegramId: string | null;
  telegramUsername: string | null;
  telegramFirstName?: string | null;
  telegramPhoto?: string | null;
  linkedAt?: string | null;
  isAdmin?: boolean;
}

const TelegramProfileContext = createContext<{
  telegramInfo: TelegramInfo | null;
  loading: boolean;
}>({ telegramInfo: null, loading: true });

/** Délais de retry pour laisser le temps à Telegram.WebApp de charger (initData). */
const RETRY_DELAYS_MS = [0, 300, 600, 1000, 1500];

export function TelegramProfileProvider({ children }: { children: ReactNode }) {
  const [telegramInfo, setTelegramInfo] = useState<TelegramInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let attempt = 0;

    function tryFetch() {
      if (!mountedRef.current) return;
      const initData = getInitData();
      if (initData) {
        const headers = getTelegramFetchHeaders();
        fetch('/api/telegram/me', { headers, credentials: 'include' })
          .then((res) => res.json())
          .then((data) => {
            if (mountedRef.current && data?.success && data?.telegramInfo) {
              setTelegramInfo(data.telegramInfo);
            }
          })
          .finally(() => {
            if (mountedRef.current) setLoading(false);
          });
        return;
      }
      attempt++;
      if (attempt < RETRY_DELAYS_MS.length) {
        const delay = RETRY_DELAYS_MS[attempt];
        setTimeout(tryFetch, delay);
      } else {
        setLoading(false);
      }
    }

    tryFetch();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return (
    <TelegramProfileContext.Provider value={{ telegramInfo, loading }}>
      {children}
    </TelegramProfileContext.Provider>
  );
}

export function useTelegramProfile() {
  return useContext(TelegramProfileContext);
}
