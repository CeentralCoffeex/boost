import { NextRequest, NextResponse } from 'next/server';
import { validateTelegramWebAppData } from '@/lib/telegram-webapp';
import { isBotAdmin } from '@/lib/bot-admins';
import { checkAdminAccess } from '@/lib/check-admin-access';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 5; // 5 secondes max

/** Vérification admin : session NextAuth (PC) OU initData Telegram (config.json OU table TelegramAdmin). */
export async function GET(request: NextRequest) {
  try {
    // Admin depuis PC (session NextAuth)
    if (await checkAdminAccess(request)) {
      return NextResponse.json({ allowed: true });
    }

    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const initDataHeader = request.headers.get('x-telegram-init-data');
    
    const initData = authHeader?.startsWith('tma ')
      ? authHeader.slice(4).trim()
      : (initDataHeader?.trim() || '');

    if (!initData) {
      return NextResponse.json({ allowed: false }, { status: 401 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.error('[verify] TELEGRAM_BOT_TOKEN manquant');
      return NextResponse.json({ allowed: false }, { status: 500 });
    }

    // Valider initData
    const telegramUser = validateTelegramWebAppData(initData, botToken);
    if (!telegramUser) {
      console.error('[verify] initData invalide');
      return NextResponse.json({ allowed: false }, { status: 401 });
    }

    const telegramIdStr = telegramUser.id.toString();
    const fromConfig = isBotAdmin(telegramIdStr);
    let fromDb = false;
    if (!fromConfig) {
      try {
        const admin = await Promise.race([
          prisma.telegramAdmin.findFirst({
            where: { telegramId: telegramIdStr, isActive: true },
          }),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 2000)
          ),
        ]).catch(() => null);
        fromDb = !!admin;
      } catch {
        fromDb = false;
      }
    }
    const isAdmin = fromConfig || fromDb;

    console.log(`[verify] Telegram ID ${telegramIdStr}: config=${fromConfig} db=${fromDb} => ${isAdmin ? 'ADMIN' : 'REFUSE'}`);
    if (!isAdmin) {
      // 200 + allowed: false pour que le client reçoive toujours le body (telegramId) et puisse l'afficher
      return NextResponse.json({
        allowed: false,
        telegramId: telegramIdStr,
        hint: 'Ajoutez cet ID dans bots/config.json (admin_ids), ou définissez ADMIN_TELEGRAM_IDS sur le serveur, ou ajoutez-le dans Administration > Admins Telegram.',
      });
    }
    return NextResponse.json({ allowed: true });
  } catch (error: any) {
    console.error('[verify] ERROR:', error?.message);
    return NextResponse.json({ allowed: false }, { status: 500 });
  }
}
