/**
 * Récupère le token CSRF depuis les cookies
 */
export function getCSRFToken(): string {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf-token') {
      return value || '';
    }
  }
  return '';
}

/**
 * S'assure que le token CSRF est disponible, sinon le demande
 */
async function ensureCSRFToken(): Promise<string> {
  let token = getCSRFToken();
  if (token) return token;
  
  // Token pas encore défini, on le demande
  try {
    await fetch('/api/csrf-token', { credentials: 'include' });
    // Attendre un peu que le cookie soit défini
    await new Promise(r => setTimeout(r, 100));
    token = getCSRFToken();
  } catch (e) {
    console.error('Failed to get CSRF token:', e);
  }
  
  return token;
}

/**
 * Crée les headers avec le token CSRF
 */
export function getCSRFHeaders(additionalHeaders: HeadersInit = {}): HeadersInit {
  const csrfToken = getCSRFToken();
  return {
    ...additionalHeaders,
    ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
  };
}

/**
 * Upload avec suivi de progression (XHR - fetch ne supporte pas upload progress)
 */
export function uploadWithProgress(
  url: string,
  file: File,
  options: { onProgress?: (percent: number) => void } = {}
): Promise<Response> {
  return new Promise(async (resolve, reject) => {
    const csrfToken = await ensureCSRFToken();
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.withCredentials = true;
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('x-file-name', encodeURIComponent(file.name));
    if (csrfToken) xhr.setRequestHeader('x-csrf-token', csrfToken);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && options.onProgress) {
        options.onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      const headers = new Headers();
      const headerStr = xhr.getAllResponseHeaders();
      if (headerStr) {
        headerStr.split('\r\n').forEach((line) => {
          const idx = line.indexOf(': ');
          if (idx > 0) headers.set(line.slice(0, idx).trim(), line.slice(idx + 2).trim());
        });
      }
      resolve(new Response(xhr.responseText, { status: xhr.status, statusText: xhr.statusText, headers }));
    };
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(file);
  });
}

/** initData Telegram (WebView) — pour auth sans cookies */
export function getInitDataHeader(): Record<string, string> | null {
  try {
    const d = sessionStorage?.getItem('tgInitData') || localStorage?.getItem('tgInitData');
    return d ? { Authorization: `tma ${d}` } : null;
  } catch {
    return null;
  }
}

/**
 * Effectue une requête fetch avec le token CSRF et initData (si WebView) automatiquement ajoutés
 */
export async function fetchWithCSRF(url: string, options: RequestInit = {}): Promise<Response> {
  const method = options.method?.toUpperCase() || 'GET';
  const needsCSRF = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
  
  const csrfToken = needsCSRF ? await ensureCSRFToken() : getCSRFToken();
  
  const headers = new Headers(options.headers);
  if (csrfToken && needsCSRF) {
    headers.set('x-csrf-token', csrfToken);
  }
  const initHdr = getInitDataHeader();
  if (initHdr?.Authorization) headers.set('Authorization', initHdr.Authorization);
  
  return fetch(url, {
    ...options,
    headers,
    credentials: options.credentials ?? 'include',
  });
}
