import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateTelegramWebAppData } from '@/lib/telegram-webapp';
import { refreshProfileSchema, validateAndSanitize, formatZodErrors } from '@/lib/validation';

/**
 * Met à jour le profil Telegram (photo, pseudo, prénom) à chaque ouverture de l'app.
 * Appelé par le client avec initData depuis Telegram WebApp.
 * TELEGRAM_BOT_TOKEN : serveur uniquement (process.env), jamais exposé au frontend.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 });
    }

    const validation = validateAndSanitize(refreshProfileSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: formatZodErrors(validation.errors) },
        { status: 400 }
      );
    }
    const initData = validation.data.initData;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'Configuration manquante' }, { status: 500 });
    }

    const telegramUser = validateTelegramWebAppData(initData, botToken);
    if (!telegramUser) {
      return NextResponse.json({ error: 'Données Telegram invalides' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { id: session.user.id },
      select: { id: true, telegramId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    // Mettre à jour uniquement si le telegramId correspond (ou si pas encore lié, on lie)
    const telegramIdStr = telegramUser.id.toString();
    if (user.telegramId && user.telegramId !== telegramIdStr) {
      return NextResponse.json({ error: 'Compte Telegram différent' }, { status: 403 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        telegramPhoto: telegramUser.photo_url || null,
        telegramFirstName: telegramUser.first_name,
        telegramUsername: telegramUser.username || null,
        ...(!user.telegramId && {
          telegramId: telegramIdStr,
          telegramLinkedAt: new Date(),
        }),
      },
      select: {
        telegramPhoto: true,
        telegramUsername: true,
        telegramFirstName: true,
        telegramId: true,
        telegramLinkedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      telegramInfo: {
        linked: !!updated.telegramId,
        telegramId: updated.telegramId,
        telegramUsername: updated.telegramUsername,
        telegramFirstName: updated.telegramFirstName,
        telegramPhoto: updated.telegramPhoto,
        linkedAt: updated.telegramLinkedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error('[refresh-profile] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du profil' },
      { status: 500 }
    );
  }
}
