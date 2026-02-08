'use client';

import { useEffect, useState } from 'react';
import { getInitData } from '@/lib/telegram-client';

// Injected at build time via next.config.js env (from TELEGRAM_ONLY in .env)
const TELEGRAM_ONLY = process.env.NEXT_PUBLIC_TELEGRAM_ONLY === 'true';

/**
 * Bloque l'accès au site si l'utilisateur n'ouvre pas via Telegram WebApp.
 * initData disponible dès le chargement (script beforeInteractive).
 */
export default function TelegramAccessGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isViaTelegram, setIsViaTelegram] = useState<boolean | null>(null);

  useEffect(() => {
    if (!TELEGRAM_ONLY) {
      setIsViaTelegram(true);
      return;
    }
    try {
      const initData = getInitData();
      setIsViaTelegram(!!initData);
    } catch {
      setIsViaTelegram(false);
    }
  }, []);

  useEffect(() => {
    if (isViaTelegram === false || isViaTelegram === null) {
      document.documentElement.classList.add('tg-guard-blocking');
      document.body.classList.add('tg-guard-blocking');
      return () => {
        document.documentElement.classList.remove('tg-guard-blocking');
        document.body.classList.remove('tg-guard-blocking');
      };
    }
  }, [isViaTelegram]);

  if (isViaTelegram === null) {
    return <div className="tg-guard-loading" />;
  }

  if (!isViaTelegram) {
    return (
      <div className="tg-guard-overlay">
        <div className="tg-guard-box">
          <div className="tg-guard-icon-wrap">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.95)"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          </div>
          <h1 className="tg-guard-title">Accès interdit</h1>
          <p className="tg-guard-text">
            Ouvrez ce site depuis l&apos;application Telegram pour y accéder.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
