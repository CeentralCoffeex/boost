import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Inter, Orbitron, Rajdhani, Dancing_Script } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import "../styles/style.css";
import "../styles/mobile-responsive.css";
import "../styles/mobile-shell.css";
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
