import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { securityMiddleware } from '@/middleware/security';

// --- Nonce generator for CSP ---
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...Array.from(array))).replace(/[+/=]/g, m => ({ '+': '-', '/': '_', '=': '' }[m] || ''));
}

// --- Content Security Policy avec nonce (remplace unsafe-inline) ---
// Next.js 14+ ajoute automatiquement le nonce aux scripts inline si x-nonce est dans la requête.
function getCSP(nonce: string | null): string {
  const scriptSrc = nonce
    ? `'self' 'nonce-${nonce}' 'strict-dynamic' http: https: data:`
    : `'self' 'unsafe-inline' http: https: data:`;
  // Nonce + unsafe-hashes + hashes suggérés : styles inline React hashés (console propre)
  const styleSrc = nonce
    ? `'self' 'nonce-${nonce}' 'unsafe-hashes' 'sha256-3EP1piOo/O4YWqWO7mQYW6fCsMcX8uB/C/w3Cgomac4=' 'sha256-yuY5YkC888YXslo0iEiDyHcQxfWzqv77GWKJIViPoIs=' 'sha256-RWoc6304TIc8AZk2lPq1xGu/dtNXGbK5I1MajeZ2YKY=' http: https: data: https://fonts.googleapis.com`
    : `'self' http: https: data: https://fonts.googleapis.com`;
  const base = `
    default-src 'self' http: https: data: blob:;
    script-src ${scriptSrc};
    style-src ${styleSrc};
    img-src 'self' data: http: https: blob:;
    font-src 'self' http: https: data: https://fonts.gstatic.com;
    connect-src 'self' http: https: wss: ws:;
    media-src 'self' http: https: data: blob:;
    worker-src 'self' blob:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-src 'self' http: https: data:;
    frame-ancestors 'self';
  `.replace(/\s{2,}/g, ' ').trim();
  if (process.env.NODE_ENV !== 'production') {
    return base.replace(
      'connect-src ',
      "connect-src 'self' http: https: wss: ws: https://www.google-analytics.com https://vitals.vercel-insights.com "
    );
  }
  return base;
}

// --- Security headers (nonce optionnel pour les pages HTML) ---
function applySecurityHeaders(
  response: NextResponse,
  request: NextRequest,
  options?: { nonce?: string | null }
): void {
  const { pathname } = new URL(request.url);
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  const nonce = options?.nonce ?? null;
  response.headers.set('Content-Security-Policy', getCSP(nonce));
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  if (pathname.startsWith('/_next/static/') || pathname.startsWith('/static/')) response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
}

// --- Handle API requests ---
function handleAPIRequest(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/api/')) return null;

  const response = NextResponse.next();
  const origin = request.headers.get('origin');
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001').split(',').map((o) => o.trim()).filter(Boolean);
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV !== 'production') {
    response.headers.set('Access-Control-Allow-Origin', '*');
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, x-csrf-token, x-api-key, x-file-name');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400');
  if (request.method === 'OPTIONS') return new NextResponse(null, { status: 200, headers: response.headers });
  return response;
}

// --- Redirect handler ---
function handleRedirects(): NextResponse | null { return null; }

// --- Performance optimization ---
function optimizePerformance(request: NextRequest, response: NextResponse): void {
  const { pathname } = request.nextUrl;
  if (pathname === '/') response.headers.set('Link', '<https://fonts.googleapis.com>; rel=dns-prefetch, <https://www.google-analytics.com>; rel=dns-prefetch');
  response.headers.set('Vary', 'Accept-Encoding');
  if (pathname.includes('/images/') || pathname.includes('/icons/')) response.headers.set('Cache-Control', 'public, max-age=2592000, immutable');
}

// --- Routes config ---
const protectedRoutes = ['/user/profile','/user/settings','/api/admin','/api/user'];
const publicRoutes = ['/', '/auth/login', '/auth/signup', '/login', '/register', '/forgot-password', '/reset-password', '/unauthorized', '/contact', '/panier', '/categorie', '/profil', '/product'];
const publicApiRoutes = ['/api/auth/signin','/api/auth/signout','/api/auth/session','/api/auth/providers','/api/auth/callback','/api/auth/csrf','/api/csrf-token','/api/public','/api/analytics/track','/api/qr-track','/api/track-png-open','/api/uploads'];

// --- CSRF validation (double-submit cookie) ---
function validateCSRFToken(request: NextRequest): boolean {
  const tokenHeader = request.headers.get('x-csrf-token');
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/csrf-token=([^;]+)/);
  const tokenCookie = match ? decodeURIComponent(match[1].trim()) : '';
  if (!tokenHeader || !tokenCookie) return false;
  return tokenHeader === tokenCookie;
}

// --- MAIN PROXY (formerly middleware) ---
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  let authToken: any = null;

  // Ignore static files
  if (pathname.startsWith('/_next/') || pathname.startsWith('/favicon.ico') || (pathname.includes('.') && !pathname.startsWith('/api/'))) return NextResponse.next();

  // --- RATE LIMITING + BRUTE FORCE + IP FILTER ---
  const securityConfig = {
    enableIPFiltering: process.env.NODE_ENV === 'production',
    enableRateLimiting: true,
    enableBruteForceProtection: true,
    maxLoginAttempts: 12,
    lockoutDuration: 15,
    rateLimitWindow: 15,
    rateLimitMax: 500,
  };
  const securityResult = await securityMiddleware(request, securityConfig);
  if (securityResult) return securityResult;

  // CSRF pour routes mutantes (sauf celles avec auth dédiée ou x-api-key)
  if (['POST','PUT','DELETE','PATCH'].includes(request.method) && pathname.startsWith('/api/')) {
    // Bypass CSRF si x-api-key valide (requêtes du bot)
    const apiKey = request.headers.get('x-api-key');
    const validApiKey = process.env.BOT_API_KEY;
    const hasBotAuth = apiKey && validApiKey && apiKey === validApiKey;
    
    const csrfExempt = [
      '/api/auth/',
      '/api/telegram/webhook',  // secret_token
      '/api/telegram/refresh-profile',  // session + initData
      '/api/telegram/debug',    // diagnostic initData
      '/api/telegram/me',       // auth via initData (doc Telegram)
      '/api/analytics/',
      '/api/public',
      '/api/qr-track',
      '/api/track-png-open',
      '/api/upload',            // vérifie checkAdminAccess en interne
      '/api/admin/',            // admin : session vérifiée en interne
      '/api/categories',        // admin : session vérifiée
      '/api/products',          // admin : session vérifiée
      '/api/slider',            // admin : session vérifiée
      '/api/settings',          // admin : session vérifiée
      '/api/telegram/admins',   // admin : session vérifiée
      '/api/order-telegram',    // admin : session vérifiée
      '/api/services',          // admin : session vérifiée
      '/api/profile-blocks',    // admin : session vérifiée
      '/api/user/',             // session vérifiée
    ];
    const needsCsrf = !csrfExempt.some((e) => pathname.startsWith(e));
    if (needsCsrf && !hasBotAuth && !validateCSRFToken(request)) {
      return NextResponse.json({ error: 'CSRF Token Invalid' }, { status: 403 });
    }
  }

  // Public routes
  const isPublic = publicRoutes.some(r=>pathname.startsWith(r)) || publicApiRoutes.some(r=>pathname.startsWith(r));
  if (isPublic) {
    const redirectResp = handleRedirects();
    if (redirectResp) return redirectResp;
    const apiResp = handleAPIRequest(request);
    if (apiResp) { applySecurityHeaders(apiResp, request); return apiResp; }
    const nonce = generateNonce();
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);
    const resp = NextResponse.next({ request: { headers: requestHeaders } });
    applySecurityHeaders(resp, request, { nonce });
    optimizePerformance(request, resp);
    return resp;
  }

  // Protected routes
  const isProtected = protectedRoutes.some(r=>pathname.startsWith(r));
  if (!isProtected) {
    const nonce = generateNonce();
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);
    const resp = NextResponse.next({ request: { headers: requestHeaders } });
    applySecurityHeaders(resp, request, { nonce });
    optimizePerformance(request, resp);
    return resp;
  }

  // Auth
  if (!nextAuthSecret) return NextResponse.redirect(new URL('/auth/login', request.url));
  authToken = await getToken({ req: request, secret: nextAuthSecret });
  if (!authToken) { const loginUrl = new URL('/login', request.url); loginUrl.searchParams.set('callbackUrl', pathname); return NextResponse.redirect(loginUrl); }

  const nonce = generateNonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  const resp = NextResponse.next({ request: { headers: requestHeaders } });
  applySecurityHeaders(resp, request, { nonce });
  optimizePerformance(request, resp);
  return resp;
}

// --- Matcher configuration ---
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.).*)',
    '/api/:path*',
  ],
};
