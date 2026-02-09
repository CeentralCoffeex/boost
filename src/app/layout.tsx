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
        <style
          dangerouslySetInnerHTML={{
            __html: [
              '/* Critical: header page catégorie + barre menu + bouton VOIR (affichage immédiat) */',
              '.page-categorie{min-height:100vh;background:#f5f5f5;padding:20px;padding-top:80px;padding-bottom:120px;box-sizing:border-box;}',
              '.page-categorie-header{position:fixed;top:0;left:0;right:0;background:#f5f5f5;padding:20px;z-index:100;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.05);box-sizing:border-box;}',
              '.page-categorie-back,.page-categorie-back-btn{position:absolute;left:20px;background:transparent;border:none;border-radius:50%;width:48px;height:48px;display:flex;align-items:center;justify-content:center;cursor:pointer;}',
              '.page-categorie-header h1{font-family:Orbitron,sans-serif;font-size:24px;font-weight:700;color:#333;margin:0;text-transform:uppercase;}',
              '.menu-bar-section{width:100%;max-width:100%;box-sizing:border-box;position:relative;z-index:100;}',
              '.menu-bar-wrapper{width:100%;max-width:100%;box-sizing:border-box;overflow:visible;position:relative;background:rgba(255,255,255,.95);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.12);border:1px solid rgba(255,255,255,.5);}',
              '.menu-bar{width:100%;box-sizing:border-box;display:flex;align-items:center;justify-content:flex-start;min-height:56px;position:relative;padding:8px 16px 8px 24px;}',
              '.menu-bar-voir-btn{position:absolute;right:16px;top:40%;transform:translateY(-50%);background:#1a1a1a;color:#fff;padding:8px 16px;border:none;border-radius:8px;font-weight:600;font-size:12px;cursor:pointer;font-family:Montserrat,sans-serif;min-width:60px;max-width:70px;flex-shrink:0;}',
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
      </body>
    </html>
  );
}
