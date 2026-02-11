/**
 * Protection API type maisonp59 : plusieurs couches.
 *
 * 1) InitData (hash HMAC côté serveur) — obligatoire.
 *    Pas basé sur User-Agent / Origin / Referer.
 *
 * 2) Contexte WebApp : optionnellement X-Telegram-Platform (envoyé par le client).
 *
 * 3) Restriction stricte Mobile App (STRICT_TELEGRAM_MOBILE_APP=true) :
 *    on n'accepte que X-Telegram-Platform = "android" | "ios".
 *    "weba" (Telegram Desktop), "tdesktop", curl, etc. → 403 BOT_DETECTED.
 *
 * Assets statiques hors /api/ restent servis normalement.
 */
import { NextRequest, NextResponse } from 'next/server';
import { validateTelegramWebAppData } from '@/lib/telegram-webapp';

const UNAUTHORIZED_MESSAGE = 'Ouvrez l\'application depuis la Mini App Telegram.';
const MAX_AUTH_AGE_SEC = 24 * 60 * 60; // 24h pour limiter le replay

/** Plateformes acceptées quand STRICT_TELEGRAM_MOBILE_APP=true (uniquement Mobile App). */
const ALLOWED_MOBILE_PLATFORMS = new Set(['android', 'ios']);

function isStrictMobileAppEnabled(): boolean {
  return process.env.STRICT_TELEGRAM_MOBILE_APP !== 'false';
}

export type TelegramAppUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
};

/**
 * Extrait initData depuis les headers (Authorization: tma <initData> ou X-Telegram-Init-Data).
 */
export function getInitDataFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  const initDataHeader = request.headers.get('x-telegram-init-data');
  const initData = authHeader?.startsWith('tma ')
    ? authHeader.slice(4).trim()
    : (initDataHeader?.trim() || '');
  return initData || null;
}

/**
 * Vérifie que la requête provient de la Mobile App Telegram (android/ios) quand
 * STRICT_TELEGRAM_MOBILE_APP=true. Lit le header X-Telegram-Platform.
 */
function isAllowedTelegramPlatform(request: NextRequest): boolean {
  if (!isStrictMobileAppEnabled()) return true;
  const platform = request.headers.get('x-telegram-platform')?.toLowerCase().trim() || '';
  if (ALLOWED_MOBILE_PLATFORMS.has(platform)) return true;
  if (!platform) return true; // initData valide suffit si le client n'envoie pas la plateforme
  return false;
}

/**
 * Vérifie que la requête provient de la Mini App Telegram (initData valide côté serveur).
 * Optionnel : rejette les initData trop anciens (replay).
 * @returns { valid: true, user } ou null si invalide
 */
export function requireTelegramApp(
  request: NextRequest,
  options?: { maxAuthAgeSec?: number }
): { valid: true; user: TelegramAppUser } | null {
  const initData = getInitDataFromRequest(request);
  if (!initData) return null;

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error('[requireTelegramApp] TELEGRAM_BOT_TOKEN manquant');
    return null;
  }

  const user = validateTelegramWebAppData(initData, botToken);
  if (!user) return null;

  const maxAge = options?.maxAuthAgeSec ?? MAX_AUTH_AGE_SEC;
  if (maxAge > 0) {
    const urlParams = new URLSearchParams(initData);
    const authDate = urlParams.get('auth_date');
    if (authDate) {
      const ts = parseInt(authDate, 10);
      if (!Number.isFinite(ts) || Date.now() / 1000 - ts > maxAge) {
        return null;
      }
    }
  }

  // Restriction stricte Mobile App (comme maisonp59) : uniquement android/ios
  if (!isAllowedTelegramPlatform(request)) return null;

  return { valid: true, user };
}

/**
 * Si la requête n'a pas d'initData Telegram valide, retourne une NextResponse 401.
 */
export function requireTelegramAppOr401(
  request: NextRequest,
  options?: { maxAuthAgeSec?: number }
): NextResponse | null {
  const result = requireTelegramApp(request, options);
  if (result) return null;
  return NextResponse.json(
    { error: UNAUTHORIZED_MESSAGE },
    { status: 401 }
  );
}

/** Réponse 403 type "bot détecté" pour décourager les scrapers (pas de détail). */
const BOT_DETECTED_BODY = { error: 'BOT_DETECTED' } as const;

/**
 * Si la requête n'a pas d'initData Telegram valide, retourne 403 avec BOT_DETECTED.
 * À utiliser sur les routes catalogue/menu pour ne pas révéler que l'auth est Telegram.
 */
export function requireTelegramAppOr403(
  request: NextRequest,
  options?: { maxAuthAgeSec?: number }
): NextResponse | null {
  const result = requireTelegramApp(request, options);
  if (result) return null;
  return NextResponse.json(BOT_DETECTED_BODY, { status: 403 });
}

/**
 * Vérifie accès : admin (session ou initData admin) OU initData Telegram valide.
 * Si aucun des deux → 403 BOT_DETECTED. À utiliser avec checkAdminAccess (async).
 */
export async function requireTelegramOrAdminOr403(
  request: NextRequest,
  checkAdminAccess: (req: NextRequest) => Promise<boolean>,
  options?: { maxAuthAgeSec?: number }
): Promise<NextResponse | null> {
  if (await checkAdminAccess(request)) return null;
  return requireTelegramAppOr403(request, options);
}
