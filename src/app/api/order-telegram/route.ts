import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { checkAdminAccess } from '@/lib/check-admin-access';
import { requireTelegramOrAdminOr403 } from '@/lib/require-telegram-app';
import { getBotConfigPath } from '@/lib/bot-admins';

function loadConfig(): Record<string, unknown> {
  const configPath = getBotConfigPath();
  if (!fs.existsSync(configPath)) return {};
  const raw = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(raw) as Record<string, unknown>;
}

function saveConfig(cfg: Record<string, unknown>): void {
  fs.writeFileSync(getBotConfigPath(), JSON.stringify(cfg, null, 2), 'utf-8');
}

/** Sanitize Telegram username: remove @, keep alphanumeric + underscore */
function sanitizeUsername(val: string): string {
  return val.replace(/^@/, '').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'savpizz13';
}

export async function GET(request: NextRequest) {
  const forbidden = await requireTelegramOrAdminOr403(request, checkAdminAccess);
  if (forbidden) return forbidden;
  try {
    const cfg = loadConfig();
    const username = (cfg.order_telegram_username as string) || 'savpizz13';
    const platform = (cfg.order_platform as string) === 'signal' ? 'signal' : 'telegram';
    const signalLink = (cfg.order_signal_link as string) || '';
    return NextResponse.json({
      orderTelegramUsername: sanitizeUsername(username),
      orderPlatform: platform,
      orderSignalLink: signalLink,
    });
  } catch (error) {
    console.error('[order-telegram GET]', error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!(await checkAdminAccess(request))) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 });
    }
    const { orderTelegramUsername, orderPlatform, orderSignalLink } = body as {
      orderTelegramUsername?: string;
      orderPlatform?: string;
      orderSignalLink?: string;
    };
    const platform = orderPlatform === 'signal' ? 'signal' : 'telegram';
    const cfg = loadConfig();

    if (platform === 'telegram') {
      const username = typeof orderTelegramUsername === 'string' && orderTelegramUsername.trim()
        ? sanitizeUsername(orderTelegramUsername)
        : (cfg.order_telegram_username as string) || 'savpizz13';
      cfg.order_telegram_username = username;
    }
    if (platform === 'signal') {
      cfg.order_signal_link = typeof orderSignalLink === 'string' ? orderSignalLink.trim() : '';
    }
    cfg.order_platform = platform;
    saveConfig(cfg);

    return NextResponse.json({
      orderTelegramUsername: (cfg.order_telegram_username as string) || 'savpizz13',
      orderPlatform: cfg.order_platform,
      orderSignalLink: (cfg.order_signal_link as string) || '',
    });
  } catch (error) {
    console.error('[order-telegram PUT]', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
}
