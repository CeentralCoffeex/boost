import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import theme from './theme/theme';
import { RouterProvider } from 'react-router-dom';
import { CssBaseline, ThemeProvider, CircularProgress, Box } from '@mui/material';
import BreakpointsProvider from './providers/BreakpointsProvider';
import router from './routes/router';
import './index.css';
import './admin-theme.css';

const THEMES = ['blanc', 'blue-white', 'noir', 'orange', 'violet', 'rouge', 'jaune'] as const;

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

// Flag global pour savoir si le CSRF est prêt
(window as any).__csrfReady = false;

async function initCSRF(): Promise<void> {
  try {
    await fetch('/api/csrf-token', { credentials: 'include' });
    (window as any).__csrfReady = true;
  } catch (e) {
    console.error('Failed to init CSRF:', e);
    // Retry after 1s
    await new Promise(r => setTimeout(r, 1000));
    await initCSRF();
  }
}

async function applyAdminTheme(): Promise<void> {
  // S'assurer que le CSRF est initialisé d'abord
  await initCSRF();
  
  try {
    const res = await fetch('/api/settings', { credentials: 'include' });
    const data = await res.json();
    let t = THEMES.includes(data?.theme as any) ? data.theme : 'blanc';
    if (t === 'blanc') t = 'noir';
    document.documentElement.setAttribute('data-theme', t);
  } catch {
    document.documentElement.setAttribute('data-theme', 'noir');
  }
}

function AdminThemeLoader({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  
  useEffect(() => {
    applyAdminTheme().then(() => setReady(true));
    const onThemeChange = () => applyAdminTheme();
    window.addEventListener('admin-theme-changed', onThemeChange);
    return () => window.removeEventListener('admin-theme-changed', onThemeChange);
  }, []);
  
  if (!ready) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: '#1a1a2e' }}>
        <CircularProgress sx={{ color: '#c5a03d' }} />
      </Box>
    );
  }
  
  return <>{children}</>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AdminThemeLoader>
      <ThemeProvider theme={theme}>
        <BreakpointsProvider>
          <CssBaseline />
          <RouterProvider router={router} />
        </BreakpointsProvider>
      </ThemeProvider>
    </AdminThemeLoader>
  </React.StrictMode>,
);
