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

/** Polling toutes les 200 ms jusqu'à 6 s pour laisser Telegram charger l'initData. */
const POLL_INTERVAL_MS = 200;
const POLL_MAX_MS = 6000;

function fetchTelegramMe(setInfo: (info: TelegramInfo | null) => void, setLoading: (v: boolean) => void, mountedRef: React.RefObject<boolean>) {
  const headers = getTelegramFetchHeaders();
  if (!(headers as Record<string, string>)['Authorization']) return false;
  fetch('/api/telegram/me', { headers, credentials: 'include' })
    .then((res) => res.json())
    .then((data) => {
      if (mountedRef.current && data?.success && data?.telegramInfo) {
        setInfo(data.telegramInfo);
      }
    })
    .finally(() => {
      if (mountedRef.current) setLoading(false);
    });
  return true;
}

export function TelegramProfileProvider({ children }: { children: ReactNode }) {
  const [telegramInfo, setTelegramInfo] = useState<TelegramInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    let attempts = 0;
    const maxAttempts = POLL_MAX_MS / POLL_INTERVAL_MS;

    function tryFetch() {
      if (!mountedRef.current) return;
      const initData = getInitData();
      if (initData) {
        if (fetchTelegramMe(setTelegramInfo, setLoading, mountedRef)) {
          hasFetchedRef.current = true;
          return;
        }
      }
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(tryFetch, POLL_INTERVAL_MS);
      } else {
        setLoading(false);
      }
    }

    tryFetch();

    const onVisible = () => {
      if (!mountedRef.current || hasFetchedRef.current) return;
      if (getInitData()) {
        setLoading(true);
        fetchTelegramMe(setTelegramInfo, setLoading, mountedRef);
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisible);
    }
    return () => {
      mountedRef.current = false;
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisible);
      }
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
