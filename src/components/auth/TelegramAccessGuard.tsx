'use client';

import { useEffect, useState } from 'react';
import { getInitData } from '@/lib/telegram-client';

const TELEGRAM_ONLY = process.env.NEXT_PUBLIC_TELEGRAM_ONLY === 'true';

/** Détecte si la page est en iframe (embed, console preview, mini fenêtre intégrée). */
function isInIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true; // accès à top bloqué = probablement iframe
  }
}

function getInitialAllowed(): boolean | null {
  if (typeof window === 'undefined') return null;
  if (isInIframe()) return false;
  if (!TELEGRAM_ONLY) return true;
  return getInitData() ? true : null;
}

/**
 * Bloque l'accès si :
 * - la page est ouverte en iframe (embed, console, mini fenêtre intégrée),
 * - ou en mode TELEGRAM_ONLY si pas ouvert via la vraie Mini App Telegram.
 */
export default function TelegramAccessGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const [allowed, setAllowed] = useState<boolean | null>(getInitialAllowed);

  useEffect(() => {
    if (isInIframe()) {
      setAllowed(false);
      return;
    }
    if (!TELEGRAM_ONLY) {
      setAllowed(true);
      return;
    }
    if (getInitData()) {
      setAllowed(true);
      return;
    }
    const t = setTimeout(() => setAllowed(!!getInitData()), 200);
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
    if (allowed === false) {
      document.documentElement.classList.add('tg-guard-blocking');
      document.body.classList.add('tg-guard-blocking');
      return () => {
        document.documentElement.classList.remove('tg-guard-blocking');
        document.body.classList.remove('tg-guard-blocking');
      };
    }
  }, [allowed]);

  if (allowed === false) {
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
            Ouvrez ce site uniquement depuis la Mini App Telegram (bot), pas dans un navigateur, une console ou une fenêtre intégrée.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
