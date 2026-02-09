import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Inter, Orbitron, Rajdhani, Dancing_Script } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import "../styles/style.css";
import "../styles/mobile-shell.css";
import "../styles/index-mobile.css";
import "../styles/category-page.css";
import "../styles/theme.css";
import AuthSessionProvider from '../components/auth/SessionProvider';
import ClientLayout from '../components/layout/ClientLayout';
import TelegramAccessGuard from '../components/auth/TelegramAccessGuard';
import { TelegramProfileProvider } from '../contexts/TelegramProfileContext';
import ErrorBoundary from '../components/ErrorBoundary';


const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const orbitron = Orbitron({ 
  subsets: ["latin"], 
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-orbitron'
});
const rajdhani = Rajdhani({ 
  subsets: ["latin"], 
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-rajdhani'
});
const dancingScript = Dancing_Script({ 
  subsets: ["latin"], 
  weight: ['400', '500', '600', '700'],
  variable: '--font-dancing-script'
});

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export const metadata: Metadata = {
  title: "7PLUGAPP",
  description: "7Plugster — Votre boutique en ligne sur Telegram. Découvrez nos produits et commandez en quelques clics.",
  icons: {
    icon: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
  },
  openGraph: {
    title: "7PLUGAPP",
    description: "7Plugster — Votre boutique en ligne sur Telegram. Découvrez nos produits et commandez en quelques clics.",
  },
  other: {
    "msapplication-navbutton-color": "#ffffff",
  },
};

export default async function RootLayout({
  children,
  modal
}: {
  children: React.ReactNode;
  modal?: React.ReactNode;
}) {
  let nonce: string | undefined;
  try {
    const headersList = await headers();
    nonce = headersList.get("x-nonce") ?? undefined;
  } catch {
    nonce = undefined;
  }
  return (
    <html lang="fr" data-theme="blanc" {...(nonce ? { nonce } : {})}>
      <head>
        {/* CSS critique barre menu : même règles que index-mobile.css pour 1er paint sans conflit */}
        <style
          dangerouslySetInnerHTML={{
            __html: [
              'body .menu-bar-section{width:100%!important;max-width:100%!important;box-sizing:border-box!important;position:relative!important;z-index:100!important;display:block!important;padding:0 16px 16px!important;}',
              'body .menu-bar-wrapper{width:100%!important;max-width:100%!important;box-sizing:border-box!important;overflow:visible!important;position:relative!important;display:block!important;background:rgba(255,255,255,0.95)!important;backdrop-filter:blur(12px)!important;-webkit-backdrop-filter:blur(12px)!important;border-radius:12px!important;box-shadow:0 8px 30px rgba(0,0,0,0.12)!important;border:1px solid rgba(255,255,255,0.5)!important;}',
              'body .menu-bar{width:100%!important;box-sizing:border-box!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;min-height:56px!important;position:relative!important;padding:8px 16px 8px 24px!important;}',
              'body .menu-bar-trigger{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:2px!important;cursor:pointer!important;}',
              'body .menu-bar-label{font-family:Montserrat,sans-serif!important;font-weight:600!important;color:#1f2937!important;font-size:16px!important;}',
              'body .menu-bar-chevron{width:20px!important;height:20px!important;color:#1f2937!important;}',
              'body .menu-bar-voir-btn{position:absolute!important;right:16px!important;top:50%!important;transform:translateY(-50%)!important;background:#1a1a1a!important;color:#fff!important;padding:8px 16px!important;border:none!important;border-radius:8px!important;font-weight:600!important;font-size:12px!important;cursor:pointer!important;font-family:Montserrat,sans-serif!important;min-width:60px!important;max-width:70px!important;flex-shrink:0!important;appearance:none!important;-webkit-appearance:none!important;box-sizing:border-box!important;}',
            ].join(''),
          }}
        />
        <style
          dangerouslySetInnerHTML={{
            __html: [
              'body .page-categorie{min-height:100vh!important;background:#f5f5f5!important;padding:20px!important;padding-top:80px!important;padding-bottom:120px!important;box-sizing:border-box!important;}',
              'body .page-categorie-header{position:fixed!important;top:0!important;left:0!important;right:0!important;background:#f5f5f5!important;padding:20px!important;z-index:100!important;display:flex!important;align-items:center!important;justify-content:center!important;box-shadow:0 2px 8px rgba(0,0,0,.05)!important;box-sizing:border-box!important;}',
              'body .page-categorie-back,body .page-categorie-back-btn{position:absolute!important;left:20px!important;background:transparent!important;border:none!important;border-radius:50%!important;width:48px!important;height:48px!important;display:flex!important;align-items:center!important;justify-content:center!important;cursor:pointer!important;}',
              'body .page-categorie-header h1{font-family:Orbitron,sans-serif!important;font-size:24px!important;font-weight:700!important;color:#333!important;margin:0!important;text-transform:uppercase!important;}',
              'body .mobile-bottom-box{bottom:calc(24px + env(safe-area-inset-bottom,24px))!important;}',
              'body .page-categorie.page-categorie-force-light,body .page-categorie.page-categorie-notfound{background-color:#f5f5f5!important;color:#333!important;}',
              'body .page-categorie.page-categorie-notfound{min-height:100vh!important;display:flex!important;align-items:center!important;justify-content:center!important;}',
            ].join(''),
          }}
        />
        <Script src="https://telegram.org/js/telegram-web-app.js?59" strategy="beforeInteractive" nonce={nonce} />
      </head>
      <body className={`${inter.className} ${orbitron.variable} ${rajdhani.variable} ${dancingScript.variable}`}>
        <script
          dangerouslySetInnerHTML={{
            __html: [
              '(function(){var n=0;function go(){try{var t=window.Telegram&&window.Telegram.WebApp;if(t){t.ready();t.expand();return;}}catch(e){}',
              'n++;if(n<10)setTimeout(go,50);}go();})();',
            ].join(''),
          }}
        />
        <AuthSessionProvider>
          <ErrorBoundary>
            <TelegramAccessGuard>
              <TelegramProfileProvider>
                <ClientLayout modal={modal ?? null}>
                  {children}
                </ClientLayout>
              </TelegramProfileProvider>
            </TelegramAccessGuard>
          </ErrorBoundary>
        </AuthSessionProvider>
        <style dangerouslySetInnerHTML={{ __html: 'body .mobile-bottom-box{bottom:calc(24px + env(safe-area-inset-bottom,24px))!important;}' }} />
      </body>
    </html>
  );
}
