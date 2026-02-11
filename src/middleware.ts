import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware /api : rate limit + CORS uniquement.
 * Le blocage "bot" (403 BOT_DETECTED) est fait dans les routes via initData (hash),
 * pas ici : on ne bloque pas sur User-Agent ni Origin/Referer.
 */

/** 10 req/min par IP sur /api (hors auth, webhook, uploads de fichier). */
const API_RATE_LIMIT = Number(process.env.API_RATE_LIMIT_PER_MIN) || 10;
const WINDOW_MS = 60 * 1000;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function getClientIP(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || '0.0.0.0';
  return req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || '0.0.0.0';
}

/** Origines autorisées pour CORS (Telegram + domaine app). */
function getAllowedOrigins(req: NextRequest): string[] {
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

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const res = NextResponse.next();

  // --- CORS restrictif pour /api (origines Telegram + app) ---
  if (pathname.startsWith('/api/')) {
    const allowed = getAllowedOrigins(request);
    const origin = request.headers.get('origin');
    const allowOrigin = origin && isAllowedOrigin(origin, allowed) ? origin : (allowed[0] ?? '*');
    res.headers.set('Access-Control-Allow-Origin', allowOrigin);
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Telegram-Init-Data, X-Telegram-Platform');
    res.headers.set('Access-Control-Max-Age', '86400');
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: res.headers });
    }
  }

  // --- Rate limit 10 req/min sur /api (exclure webhook, auth callback, uploads) ---
  if (pathname.startsWith('/api/')) {
    const skip =
      pathname.startsWith('/api/auth/') ||
      pathname.startsWith('/api/telegram/webhook') ||
      pathname.startsWith('/api/uploads/'); // uploads peut avoir beaucoup de requêtes (médias)
    if (!skip) {
      const ip = getClientIP(request);
      const now = Date.now();
      let entry = rateLimitMap.get(ip);
      if (!entry || now > entry.resetAt) {
        entry = { count: 1, resetAt: now + WINDOW_MS };
        rateLimitMap.set(ip, entry);
      } else {
        entry.count++;
      }
      if (entry.count > API_RATE_LIMIT) {
        return NextResponse.json(
          { error: 'Trop de requêtes. Ralentissez.' },
          { status: 429, headers: res.headers }
        );
      }
      res.headers.set('X-RateLimit-Limit', String(API_RATE_LIMIT));
      res.headers.set('X-RateLimit-Remaining', String(Math.max(0, API_RATE_LIMIT - entry.count)));
    }
  }

  return res;
}

export const config = {
  matcher: ['/api/:path*'],
};
