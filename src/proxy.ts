import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { securityMiddleware } from '@/middleware/security';

// --- Rate limit /api (10 req/min par IP, comme ancien middleware) ---
const API_RATE_LIMIT = Number(process.env.API_RATE_LIMIT_PER_MIN) || 10;
const WINDOW_MS = 60 * 1000;
const apiRateLimitMap = new Map<string, { count: number; resetAt: number }>();

function getClientIPForRateLimit(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || '0.0.0.0';
  return req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || '0.0.0.0';
}

function getAllowedOriginsForCORS(req: NextRequest): string[] {
  const origins: string[] = [
    'https://web.telegram.org',
    'https://web.telegram.org.kwin',
    'https://telegram.org',
  ];
  try {
    const url = req.nextUrl;
    if (url.origin && url.origin !== 'null') origins.push(url.origin);
  } catch {
    // ignore
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
  if (appUrl) {
    const base = appUrl.startsWith('http') ? appUrl : `https://${appUrl}`;
    origins.push(base.replace(/\/$/, ''));
  }
  return origins;
}

function isAllowedOrigin(origin: string | null, allowed: string[]): boolean {
  if (!origin) return false;
  return allowed.some((a) => origin === a || origin.startsWith(a + '/'));
}

// --- Nonce generator for CSP ---
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...Array.from(array))).replace(/[+/=]/g, m => ({ '+': '-', '/': '_', '=': '' }[m] || ''));
}

// --- Content Security Policy (assouplie pour éviter blocage React/Next inline) ---
function getCSP(): string {
  const base = `
    default-src 'self' http: https: data: blob:;
    script-src 'self' 'unsafe-inline' 'unsafe-eval' http: https: data: https://telegram.org;
    style-src 'self' 'unsafe-inline' 'unsafe-hashes' http: https: data: https://fonts.googleapis.com;
    style-src-attr 'self' 'unsafe-inline' 'unsafe-hashes';
    style-src-elem 'self' 'unsafe-inline' http: https: data: https://fonts.googleapis.com;
    img-src 'self' data: http: https: blob:;
    font-src 'self' http: https: data: https://fonts.gstatic.com;
    connect-src 'self' http: https: wss: ws: https://api.telegram.org;
    media-src 'self' http: https: data: blob:;
    worker-src 'self' blob:;
    object-src 'none';
    base-uri 'self';
    form-action 'self' http: https:;
    frame-src 'self' http: https: data: https://oauth.telegram.org https://web.telegram.org;
    frame-ancestors *;
  `.replace(/\s{2,}/g, ' ').trim();
  if (process.env.NODE_ENV !== 'production') {
    return base.replace(
      'connect-src ',
      "connect-src 'self' http: https: wss: ws: https://www.google-analytics.com https://vitals.vercel-insights.com "
    );
  }
  return base;
}

// --- Security headers ---
function applySecurityHeaders(
  response: NextResponse,
  request: NextRequest,
  _options?: { nonce?: string | null }
): void {
  const { pathname } = new URL(request.url);
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.delete('X-Frame-Options');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Content-Security-Policy', getCSP());
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  if (pathname.startsWith('/_next/static/') || pathname.startsWith('/static/')) response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
}

// --- CORS pour /api (origines Telegram + app, headers X-Telegram-*) ---
function applyApiCors(request: NextRequest, response: NextResponse): void {
  const allowed = getAllowedOriginsForCORS(request);
  const origin = request.headers.get('origin');
  const allowOrigin = origin && isAllowedOrigin(origin, allowed) ? origin : (allowed[0] ?? '*');
  response.headers.set('Access-Control-Allow-Origin', allowOrigin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Telegram-Init-Data, X-Telegram-Platform, X-Requested-With, x-csrf-token, x-api-key, x-file-name');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400');
}

// --- Handle API requests ---
function handleAPIRequest(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/api/')) return null;

  const response = NextResponse.next();
  applyApiCors(request, response);
  if (request.method === 'OPTIONS') return new NextResponse(null, { status: 204, headers: response.headers });
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

  // --- BLOQUER ACCÈS PC : tout le site (pages + API) sauf webhook Telegram ---
  const blockPc = process.env.TELEGRAM_ONLY === 'true' || process.env.BLOCK_PC_ACCESS === 'true';
  if (blockPc) {
    const ua = (request.headers.get('user-agent') || '').toLowerCase();
    const isMobileOrTelegram = /telegram|android|iphone|ipad|webapp|mobile/i.test(ua);
    const isWebhook = pathname.startsWith('/api/telegram/webhook');
    if (!isWebhook && !isMobileOrTelegram) {
      if (pathname.startsWith('/api/')) {
        const res = NextResponse.json(
          { error: 'BOT_DETECTED', message: 'Ouvrez depuis l\'application Telegram (Mini App).' },
          { status: 403 }
        );
        applyApiCors(request, res);
        return res;
      }
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Accès réservé</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#1a1a1a;color:#fff;font-family:system-ui,sans-serif;text-align:center;padding:20px;}h1{font-size:1.5rem;}p{opacity:.9;max-width:320px;}</style></head><body><div><h1>Accès réservé</h1><p>Ouvrez ce site uniquement depuis l’application Telegram (Mini App du bot), pas depuis un navigateur sur PC.</p></div></body></html>`;
      return new NextResponse(html, { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
  }

  // --- RATE LIMIT /api (10 req/min par IP, ex-auth/webhook/uploads) ---
  if (pathname.startsWith('/api/')) {
    const skip =
      pathname.startsWith('/api/auth/') ||
      pathname.startsWith('/api/telegram/webhook') ||
      pathname.startsWith('/api/uploads/');
    if (!skip) {
      const ip = getClientIPForRateLimit(request);
      const now = Date.now();
      let entry = apiRateLimitMap.get(ip);
      if (!entry || now > entry.resetAt) {
        entry = { count: 1, resetAt: now + WINDOW_MS };
        apiRateLimitMap.set(ip, entry);
      } else {
        entry.count++;
      }
      if (entry.count > API_RATE_LIMIT) {
        const res = NextResponse.json({ error: 'Trop de requêtes. Ralentissez.' }, { status: 429 });
        applyApiCors(request, res);
        return res;
      }
    }
  }

  // --- RATE LIMITING + BRUTE FORCE + IP FILTER ---
  const securityConfig = {
    enableIPFiltering: process.env.NODE_ENV === 'production',
    enableRateLimiting: false,
    enableBruteForceProtection: true,
    maxLoginAttempts: 12,
    lockoutDuration: 15,
    rateLimitWindow: 15,
    rateLimitMax: 999999,
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
