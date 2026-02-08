import { NextRequest, NextResponse } from 'next/server';
import { validateTelegramWebAppData } from '@/lib/telegram-webapp';

/**
 * POST /api/telegram/debug
 * Diagnostic : vérifie si initData est valide.
 * Body: { initData: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const initData = typeof body?.initData === 'string' ? body.initData : '';

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({
        ok: false,
        error: 'TELEGRAM_BOT_TOKEN non configuré',
        hasInitData: !!initData,
        initDataLength: initData.length,
      });
    }

    const telegramUser = validateTelegramWebAppData(initData, botToken);
    return NextResponse.json({
      ok: !!telegramUser,
      hasInitData: !!initData,
      initDataLength: initData.length,
      userId: telegramUser?.id ?? null,
      username: telegramUser?.username ?? null,
    });
  } catch (e) {
    console.error('[telegram/debug]', e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
