import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/check-admin-access';
import { requireTelegramOrAdminOr403 } from '@/lib/require-telegram-app';

/**
 * GET /api/health — Même protection que le catalogue (initData valide ou admin).
 * curl / User-Agent Telegram / Origin+Referer Telegram sans initData → 403 BOT_DETECTED.
 * Pas de réponse 200 sans auth valide (évite la découverte par les bots).
 */
export async function GET(request: NextRequest) {
  const forbidden = await requireTelegramOrAdminOr403(request, checkAdminAccess);
  if (forbidden) return forbidden;
  return NextResponse.json({ ok: true }, { status: 200 });
}
