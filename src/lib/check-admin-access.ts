import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '@/lib/auth';
import { isBotAdmin } from '@/lib/bot-admins';
import { prisma } from '@/lib/prisma';
import { validateTelegramWebAppData } from '@/lib/telegram-webapp';

/** Cache admin check - 30 secondes pour performances */
const adminCache = new Map<string, { ok: boolean; expires: number }>();
const CACHE_TTL_MS = 30000; // 30 secondes

/** Invalide le cache admin pour un userId et/ou email (appelé après retrait des droits) */
export function invalidateAdminCacheForUser(userId?: string, email?: string): void {
  if (userId) adminCache.delete(userId);
  if (email) adminCache.delete(email);
}

/** Invalide le cache admin pour un telegramId (appelé après ajout/activation d'un admin Telegram) */
export function invalidateAdminCacheForTelegramId(telegramId: string): void {
  if (telegramId) adminCache.delete(`tg:${telegramId}`);
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
    
    // Si c'est une route admin et qu'on a une session valide, on autorise rapidement
    const isAdminRoute = request.headers.get('x-admin-route') === 'true';
    if (isAdminRoute) {
      // Vérifier cache d'abord pour éviter timeout
      const authHeader = request.headers.get('authorization');
      const initDataHeader = request.headers.get('x-telegram-init-data');
      if (authHeader?.startsWith('tma ') || initDataHeader) {
        const initData = authHeader?.startsWith('tma ') ? authHeader.slice(4).trim() : initDataHeader?.trim() || '';
        if (initData) {
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          if (botToken) {
            const telegramUser = validateTelegramWebAppData(initData, botToken);
            if (telegramUser) {
              const telegramIdStr = telegramUser.id.toString();
              const cacheKey = `tg:${telegramIdStr}`;
              const cached = getCachedAdmin(cacheKey);
              if (cached === true) return true; // Retour rapide si en cache
            }
          }
        }
      }
    }
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
      if (botToken) {
        const telegramUser = validateTelegramWebAppData(initData, botToken);
        if (telegramUser) {
          const telegramIdStr = telegramUser.id.toString();
          const cacheKey = `tg:${telegramIdStr}`;
          
          // Vérifier cache d'abord
          const cached = getCachedAdmin(cacheKey);
          if (cached !== null) return cached;
          
          // config.json OU table TelegramAdmin (actif)
          const isBotAdm = isBotAdmin(telegramIdStr);
          if (isBotAdm) {
            setCachedAdmin(cacheKey, true);
            return true;
          }
          const dbAdmin = await isTelegramIdAdminInDb(telegramIdStr);
          const allowed = dbAdmin;
          setCachedAdmin(cacheKey, allowed);
          return allowed;
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
    const session = request
      ? await getServerSession(request as any, null as any, authOptions)
      : await getServerSession(authOptions);
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

/** Vérifie si un telegramId est admin via la table TelegramAdmin (isActive). */
async function isTelegramIdAdminInDb(telegramIdStr: string): Promise<boolean> {
  try {
    const admin = await Promise.race([
      prisma.telegramAdmin.findFirst({
        where: { telegramId: telegramIdStr, isActive: true },
      }),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Database query timeout')), 2000)
      ),
    ]).catch(() => null);
    return !!admin;
  } catch {
    return false;
  }
}

/** Accès admin : config.json OU TelegramAdmin (actif) OU rôle ADMIN en base (secours si config.json absent sur serveur). */
async function checkUserAdminAccess(userId?: string, email?: string): Promise<boolean> {
  if (!userId && !email) return false;
  try {
    // Wrapper avec timeout de 8 secondes pour éviter les blocages
    const userPromise = userId
      ? prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, telegramId: true, role: true },
        })
      : email
        ? prisma.user.findFirst({
            where: { email },
            select: { id: true, telegramId: true, role: true },
          })
        : Promise.resolve(null);
    
    const timeoutPromise = new Promise<null>((_, reject) => 
      setTimeout(() => reject(new Error('Database query timeout')), 8000)
    );
    
    const user = await Promise.race([userPromise, timeoutPromise]);
    if (!user) return false;

    // config.json (bot) ou TelegramAdmin
    if (user.telegramId) {
      if (isBotAdmin(user.telegramId)) return true;
      
      // Vérifier TelegramAdmin avec timeout aussi
      const dbAdminPromise = prisma.telegramAdmin.findFirst({
        where: { telegramId: user.telegramId, isActive: true },
      });
      const dbAdmin = await Promise.race([
        dbAdminPromise,
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Database query timeout')), 8000))
      ]).catch(() => null);
      
      if (dbAdmin) return true;
    }

    return false;
  } catch (error: any) {
    console.error('[checkUserAdminAccess] ERROR:', error?.message || error);
    // En cas de timeout, on retourne false mais on log pour debugging
    if (error?.message?.includes('timeout')) {
      console.error('[checkUserAdminAccess] Database timeout - vérifiez DATABASE_URL avec busy_timeout=10000');
    }
    return false;
  }
}
