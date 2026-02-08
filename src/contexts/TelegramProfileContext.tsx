'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getInitData } from '@/lib/telegram-client';

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

export function TelegramProfileProvider({ children }: { children: ReactNode }) {
  const [telegramInfo, setTelegramInfo] = useState<TelegramInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initData = getInitData();
    if (!initData) {
      setLoading(false);
      return;
    }
    fetch('/api/telegram/me', {
      headers: { Authorization: `tma ${initData}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.telegramInfo) {
          setTelegramInfo(data.telegramInfo);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
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
