import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateTelegramWebAppData } from '@/lib/telegram-webapp';
import { refreshProfileSchema, validateAndSanitize, formatZodErrors } from '@/lib/validation';

/** GET : infos Telegram du compte connecté */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
    }

    const user = await prisma.user.findFirst({
      where: { id: session.user.id },
      select: {
        telegramId: true,
        telegramUsername: true,
        telegramFirstName: true,
        telegramPhoto: true,
        telegramLinkedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    return NextResponse.json({
      linked: !!user.telegramId,
      telegramId: user.telegramId,
      telegramUsername: user.telegramUsername,
      telegramFirstName: user.telegramFirstName,
      telegramPhoto: user.telegramPhoto,
      linkedAt: user.telegramLinkedAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error('[api/user/telegram] GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/** POST : lier le compte Telegram via initData (WebApp) */
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

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'Configuration manquante' }, { status: 500 });
    }

    const telegramUser = validateTelegramWebAppData(validation.data.initData, botToken);
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

    const telegramIdStr = telegramUser.id.toString();
    if (user.telegramId && user.telegramId !== telegramIdStr) {
      return NextResponse.json({ error: 'Compte Telegram déjà lié à un autre utilisateur' }, { status: 403 });
    }

    const existingLink = await prisma.user.findFirst({
      where: { telegramId: telegramIdStr, NOT: { id: user.id } },
    });
    if (existingLink) {
      return NextResponse.json({ error: 'Ce compte Telegram est déjà lié à un autre utilisateur' }, { status: 409 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        telegramId: telegramIdStr,
        telegramUsername: telegramUser.username || null,
        telegramFirstName: telegramUser.first_name,
        telegramPhoto: telegramUser.photo_url || null,
        telegramLinkedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      linked: true,
      telegramId: telegramIdStr,
      telegramUsername: telegramUser.username || null,
    });
  } catch (error) {
    console.error('[api/user/telegram] POST error:', error);
    return NextResponse.json({ error: 'Erreur lors de la liaison' }, { status: 500 });
  }
}

/** DELETE : délier le compte Telegram */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        telegramId: null,
        telegramUsername: null,
        telegramFirstName: null,
        telegramPhoto: null,
        telegramLinkedAt: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/user/telegram] DELETE error:', error);
    return NextResponse.json({ error: 'Erreur lors de la déconnexion' }, { status: 500 });
  }
}
