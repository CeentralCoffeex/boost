import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '@/lib/auth';
import { isBotAdmin } from '@/lib/bot-admins';
import { prisma } from '@/lib/prisma';
import { validateTelegramWebAppData } from '@/lib/telegram-webapp';

/** Cache admin check (évite requêtes DB répétées lors d'uploads multiples) - TTL 60s */
const adminCache = new Map<string, { ok: boolean; expires: number }>();
const CACHE_TTL_MS = 60_000;

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
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('tma ')) {
      const initData = authHeader.slice(4).trim();
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (initData && botToken) {
        const telegramUser = validateTelegramWebAppData(initData, botToken);
        if (telegramUser) {
          const telegramIdStr = telegramUser.id.toString();
          const cacheKey = `tg:${telegramIdStr}`;
          const cached = getCachedAdmin(cacheKey);
          if (cached !== null) return cached;
          const ok = isBotAdmin(telegramIdStr) ||
            (await prisma.telegramAdmin.findFirst({ where: { telegramId: telegramIdStr, isActive: true } })) !== null ||
            (await prisma.user.findFirst({ where: { telegramId: telegramIdStr }, select: { role: true } }))?.role === 'ADMIN';
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
    if (!user) return false;

    // config.json (bot) ou TelegramAdmin
    if (user.telegramId) {
      if (isBotAdmin(user.telegramId)) return true;
      const dbAdmin = await prisma.telegramAdmin.findFirst({
        where: { telegramId: user.telegramId, isActive: true },
      });
      if (dbAdmin) return true;
    }

    // Secours : rôle ADMIN (utilisateur identifié admin à la connexion Telegram)
    if (user.role === 'ADMIN') return true;

    return false;
  } catch {
    return false;
  }
}
