'use client';

import { useEffect, useCallback, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Header from "../Header";
import Footer from "../Footer";
import NavGlow from '../NavGlow';
import ServiceScrollBlock from '../ServiceScrollBlock';
import SwipeBack from '../common/SwipeBack';
import TelegramLoginHandler from '../auth/TelegramLoginHandler';

const HomePage = dynamic(() => import('@/app/page'), { ssr: false });

export default function ClientLayout({
  children,
  modal
}: {
  children: React.ReactNode;
  modal?: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = pathname?.startsWith('/admin');
  const isProductPage = pathname?.includes('/product/');
  const [, setVisible] = useState(0);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        (window as Window & { Telegram?: { WebApp?: { ready?: () => void; expand?: () => void } } }).Telegram?.WebApp?.ready?.();
        (window as Window & { Telegram?: { WebApp?: { expand?: () => void } } }).Telegram?.WebApp?.expand?.();
        setVisible((n) => n + 1);
        router.refresh();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onVisible);
    };
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const valid = ['blanc', 'blue-white', 'noir', 'orange', 'violet', 'rouge', 'jaune'];
        const theme = valid.includes(data?.theme) ? data.theme : 'blanc';
        document.documentElement.setAttribute('data-theme', theme);
      })
      .catch(() => {
        if (!cancelled) document.documentElement.setAttribute('data-theme', 'blanc');
      });
    return () => { cancelled = true; };
  }, []);

  const closeOverlayWithoutReload = useCallback(() => {
    if (typeof window === 'undefined') return;
    // router.back() pour revenir à la page précédente (catégorie, accueil, etc.)
    // au lieu de replaceState qui forçait toujours vers /
    router.back();
  }, [router]);

  useEffect(() => {
    const onCloseOverlay = () => {
      closeOverlayWithoutReload();
    };
    window.addEventListener('close-product-overlay', onCloseOverlay);
    return () => window.removeEventListener('close-product-overlay', onCloseOverlay);
  }, [closeOverlayWithoutReload]);

  return (
    <>
      <SwipeBack />
      <TelegramLoginHandler />
      <NavGlow />
      <ServiceScrollBlock />

      {isAdmin ? (
        <>{children}</>
      ) : (
        <div className="main-layout-wrapper">
          <div className="container">
            <Header />
            <div className="content-wrapper">
              {/* Arrière-plan : children (page d'accueil quand intercepté) ou HomePage (nav directe) */}
              {isProductPage && !modal ? <HomePage /> : children}
            </div>
            {pathname !== '/panier' && pathname !== '/panier/checkout' && <Footer />}
          </div>

          {/* Overlay produit : apparaît au-dessus, sans glissement */}
          {isProductPage && (
            <div className="product-overlay">
              {modal || children}
            </div>
          )}
        </div>
      )}
    </>
  );
}
