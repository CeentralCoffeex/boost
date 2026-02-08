import React from 'react';
import ReactDOM from 'react-dom/client';
import theme from './theme/theme';
import { RouterProvider } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import BreakpointsProvider from './providers/BreakpointsProvider';
import router from './routes/router';
import './index.css';
import './admin-theme.css';

const THEMES = ['blanc', 'blue-white', 'noir', 'orange', 'violet', 'rouge', 'jaune'] as const;

// Récupérer initData depuis l'URL (parent le passe en param) et le stocker immédiatement
(function initFromUrl() {
  try {
    const hash = window.location.hash || '';
    const qs = hash.includes('?') ? hash.split('?')[1] : '';
    const initData = qs ? new URLSearchParams(qs).get('tgWebAppData') : null;
    if (initData) {
      sessionStorage.setItem('tgInitData', initData);
      localStorage.setItem('tgInitData', initData);
    }
  } catch {}
})();

// Intercepteur fetch : ajoute initData à toutes les requêtes /api/ (WebView Telegram sans cookies)
(function patchFetch() {
  const orig = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (typeof url === 'string' && url.includes('/api/')) {
      try {
        const d = sessionStorage?.getItem('tgInitData') || localStorage?.getItem('tgInitData');
        if (d) {
          const opts = init || {};
          const headers = new Headers(opts.headers);
          headers.set('Authorization', `tma ${d}`);
          return orig.call(this, input, { ...opts, headers });
        }
      } catch {}
    }
    return orig.call(this, input, init);
  };
})();

// Recevoir initData du parent (iframe)
window.addEventListener('message', (e) => {
  if (e.data?.type === 'TG_INIT_DATA' && e.data?.initData) {
    try {
      sessionStorage.setItem('tgInitData', e.data.initData);
      localStorage.setItem('tgInitData', e.data.initData);
    } catch {}
  }
});

function applyAdminTheme(): void {
  fetch('/api/settings', { credentials: 'include' })
    .then((res) => res.json())
    .then((data) => {
      const t = THEMES.includes(data?.theme as any) ? data.theme : 'blanc';
      document.documentElement.setAttribute('data-theme', t === 'blanc' ? 'noir' : t);
    })
    .catch(() => document.documentElement.setAttribute('data-theme', 'noir'));
}

// Appliquer le thème en arrière-plan (sans bloquer l'affichage)
applyAdminTheme();
window.addEventListener('admin-theme-changed', applyAdminTheme);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <BreakpointsProvider>
        <CssBaseline />
        <RouterProvider router={router} />
      </BreakpointsProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
