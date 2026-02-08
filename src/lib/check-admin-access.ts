import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '@/lib/auth';
import { isBotAdmin } from '@/lib/bot-admins';
import { prisma } from '@/lib/prisma';
import { validateTelegramWebAppData } from '@/lib/telegram-webapp';

/** Cache admin check - DÉSACTIVÉ pour forcer vérification en temps réel */
const adminCache = new Map<string, { ok: boolean; expires: number }>();
const CACHE_TTL_MS = 0; // Pas de cache pour sécurité

/** Invalide le cache admin pour un userId et/ou email (appelé après retrait des droits) */
export function invalidateAdminCacheForUser(userId?: string, email?: string): void {
  if (userId) adminCache.delete(userId);
  if (email) adminCache.delete(email);
}

function getCachedAdmin(key: string): boolean | null {
  const entry = adminCache.get(key);
  if (!entry || Date.now() > entry.expires) {
    if (entry) adminCache.delete(key);
    return null;
  }
  return entry.ok;
}

function setCachedAdmin(key: string, ok: boolean): void {
  adminCache.set(key, { ok, expires: Date.now() + CACHE_TTL_MS });
}

/**
 * Vérifie l'accès admin : config.json OU TelegramAdmin (actif) OU rôle ADMIN.
 * Supporte session, JWT, ou initData (WebView Telegram).
 */
export async function checkAdminAccess(request?: NextRequest | null): Promise<boolean> {
  // API key du bot (pas de cache, rapide)
  if (request) {
    const apiKey = request.headers.get('x-api-key');
    const validApiKey = process.env.BOT_API_KEY;
    if (apiKey && validApiKey && apiKey === validApiKey) return true;
  }

  // initData (WebView Telegram — pas de cookies)
  if (request) {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const initDataHeader = request.headers.get('x-telegram-init-data');
    const initData = authHeader?.startsWith('tma ')
      ? authHeader.slice(4).trim()
      : (initDataHeader?.trim() || '');
    if (initData) {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      console.log('[checkAdmin] has botToken:', !!botToken, 'initData length:', initData.length);
      if (botToken) {
        const telegramUser = validateTelegramWebAppData(initData, botToken);
        console.log('[checkAdmin] validateTelegramWebAppData result:', telegramUser ? `user ${telegramUser.id}` : 'null');
        if (telegramUser) {
          const telegramIdStr = telegramUser.id.toString();
          const cacheKey = `tg:${telegramIdStr}`;
          const cached = getCachedAdmin(cacheKey);
          if (cached !== null) {
            console.log('[checkAdmin] cached result:', cached);
            return cached;
          }
          const isBotAdm = isBotAdmin(telegramIdStr);
          const dbAdmin = await prisma.telegramAdmin.findFirst({ where: { telegramId: telegramIdStr, isActive: true } });
          console.log('[checkAdmin] checks: isBotAdmin=', isBotAdm, 'dbAdmin=', !!dbAdmin);
          // UNIQUEMENT config.json ou TelegramAdmin actif - PAS de role ADMIN
          const ok = isBotAdm || dbAdmin !== null;
          setCachedAdmin(cacheKey, ok);
          return ok;
        }
      }
    }
  }

  // Session ou JWT
  let userId: string | undefined;
  let email: string | undefined;
  if (request) {
    try {
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
      });
      if (token) {
        userId = (token.userId ?? token.sub) as string | undefined;
        email = token.email as string | undefined;
      }
    } catch {
      /* ignore */
    }
  }
  if (!userId && !email) {
    const session = await getServerSession(authOptions);
    if (session?.user) {
      userId = session.user.id;
      email = session.user.email ?? undefined;
    }
  }

  const cacheKey = userId || email || '';
  if (cacheKey) {
    const cached = getCachedAdmin(cacheKey);
    if (cached !== null) return cached;
  }

  if (userId || email) {
    const ok = await checkUserAdminAccess(userId, email);
    if (cacheKey) setCachedAdmin(cacheKey, ok);
    if (ok) return true;
  }

  return false;
}

/** Accès admin : config.json OU TelegramAdmin (actif) OU rôle ADMIN en base (secours si config.json absent sur serveur). */
async function checkUserAdminAccess(userId?: string, email?: string): Promise<boolean> {
  if (!userId && !email) return false;
  try {
    const user = userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, telegramId: true, role: true },
        })
      : email
        ? await prisma.user.findFirst({
            where: { email },
            select: { id: true, telegramId: true, role: true },
          })
        : null;
    console.log('[checkUserAdminAccess] user:', user ? `${user.id} role=${user.role}` : 'null');
    if (!user) return false;

    // config.json (bot) ou TelegramAdmin
    if (user.telegramId) {
      const isBotAdm = isBotAdmin(user.telegramId);
      console.log('[checkUserAdminAccess] isBotAdmin:', isBotAdm);
      if (isBotAdm) return true;
      const dbAdmin = await prisma.telegramAdmin.findFirst({
        where: { telegramId: user.telegramId, isActive: true },
      });
      console.log('[checkUserAdminAccess] dbAdmin:', !!dbAdmin);
      if (dbAdmin) return true;
    }

    // PLUS DE SECOURS par role ADMIN : UNIQUEMENT config.json ou TelegramAdmin actif
    console.log('[checkUserAdminAccess] FINAL RESULT: false (not in config or TelegramAdmin)');
    return false;
  } catch (error) {
    console.error('[checkUserAdminAccess] ERROR:', error);
    return false;
  }
}
