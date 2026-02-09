'use client';

import { useEffect, useState } from 'react';
import { getInitData } from '@/lib/telegram-client';

const TELEGRAM_ONLY = process.env.NEXT_PUBLIC_TELEGRAM_ONLY === 'true';

function getInitialViaTelegram(): boolean | null {
  if (typeof window === 'undefined') return null;
  if (!TELEGRAM_ONLY) return true;
  return getInitData() ? true : null;
}

/**
 * En mode TELEGRAM_ONLY, bloque l'accès si pas ouvert via Telegram.
 * Sinon on affiche le contenu tout de suite (pas d'écran de chargement).
 */
export default function TelegramAccessGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isViaTelegram, setIsViaTelegram] = useState<boolean | null>(getInitialViaTelegram);

  useEffect(() => {
    if (!TELEGRAM_ONLY) {
      setIsViaTelegram(true);
      return;
    }
    if (getInitData()) {
      setIsViaTelegram(true);
      return;
    }
    const t = setTimeout(() => setIsViaTelegram(!!getInitData()), 200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const tg = typeof window !== 'undefined' ? (window as Window & { Telegram?: { WebApp?: { ready?: () => void; expand?: () => void } } }).Telegram?.WebApp : undefined;
    if (tg) {
      tg.ready?.();
      tg.expand?.();
    }
  }, []);

  useEffect(() => {
    const onVisible = () => {
      const tg = (window as Window & { Telegram?: { WebApp?: { ready?: () => void; expand?: () => void } } }).Telegram?.WebApp;
      if (tg) {
        tg.ready?.();
        tg.expand?.();
      }
      if (TELEGRAM_ONLY && getInitData()) {
        setIsViaTelegram(true);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onVisible);
    };
  }, []);

  useEffect(() => {
    if (isViaTelegram === false) {
      document.documentElement.classList.add('tg-guard-blocking');
      document.body.classList.add('tg-guard-blocking');
      return () => {
        document.documentElement.classList.remove('tg-guard-blocking');
        document.body.classList.remove('tg-guard-blocking');
      };
    }
  }, [isViaTelegram]);

  if (isViaTelegram === false) {
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
