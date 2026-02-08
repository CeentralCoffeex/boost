import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Retourne l'URL de liaison Telegram (deep link) pour lier le compte via le bot.
 * GET /api/telegram/link-url
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
    }

    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || process.env.TELEGRAM_BOT_USERNAME;
    if (!botUsername) {
      return NextResponse.json(
        { error: 'Bot non configuré (TELEGRAM_BOT_USERNAME manquant)' },
        { status: 500 }
      );
    }

    const username = botUsername.replace(/^@/, '');
    const url = `https://t.me/${username}?start=link_${session.user.id}`;

    return NextResponse.json({ url });
  } catch (error) {
    console.error('[link-url] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
