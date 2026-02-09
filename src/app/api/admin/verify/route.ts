import { NextRequest, NextResponse } from 'next/server';
import { validateTelegramWebAppData } from '@/lib/telegram-webapp';
import { isBotAdmin } from '@/lib/bot-admins';

export const dynamic = 'force-dynamic';
export const maxDuration = 5; // 5 secondes max

/** Vérification admin RAPIDE - seulement config.json (pas de DB) */
export async function GET(request: NextRequest) {
  try {
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

    // Vérifier si admin dans config.json
    const telegramIdStr = telegramUser.id.toString();
    const isAdmin = isBotAdmin(telegramIdStr);

    console.log(`[verify] Telegram ID ${telegramIdStr}: ${isAdmin ? 'ADMIN' : 'REFUSE'}`);
    return NextResponse.json({ allowed: isAdmin });
  } catch (error: any) {
    console.error('[verify] ERROR:', error?.message);
    return NextResponse.json({ allowed: false }, { status: 500 });
  }
}
