import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateTelegramWebAppData } from '@/lib/telegram-webapp';
import { isBotAdmin } from '@/lib/bot-admins';

/**
 * GET /api/telegram/me
 * Authentification via initData (doc Telegram : "transmit them at each request").
 * Header: Authorization: tma <initData>
 * Ou query: ?initData=...
 *
 * Pas de session/cookies requis — l'initData est le facteur d'auth.
 */
export async function GET(request: NextRequest) {
  try {
    let initData: string | null = null;

    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('tma ')) {
      initData = authHeader.slice(4).trim();
    }
    if (!initData) {
      initData = request.nextUrl.searchParams.get('initData');
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'Configuration manquante' }, { status: 500 });
    }

    if (!initData) {
      return NextResponse.json({ error: 'initData requis (Authorization: tma <initData>)' }, { status: 401 });
    }

    const telegramUser = validateTelegramWebAppData(initData, botToken);
    if (!telegramUser) {
      return NextResponse.json({ error: 'Données Telegram invalides' }, { status: 401 });
    }

    const telegramIdStr = telegramUser.id.toString();
    const isBotAdminUser = isBotAdmin(telegramIdStr);

    let user = await prisma.user.findFirst({
      where: { telegramId: telegramIdStr },
      select: {
        id: true,
        telegramId: true,
        telegramUsername: true,
        telegramFirstName: true,
        telegramPhoto: true,
        telegramLinkedAt: true,
        role: true,
      },
    });

    if (!user) {
      const newUserEmail = `telegram_${telegramUser.id}@miniapp.local`;
      // NE PAS donner role ADMIN ici - seulement via config.json/TelegramAdmin
      const userRole = 'USER';
      user = await prisma.user.create({
        data: {
          email: newUserEmail,
          name: `${telegramUser.first_name}${telegramUser.last_name ? ' ' + telegramUser.last_name : ''}`,
          image: telegramUser.photo_url || null,
          telegramId: telegramIdStr,
          telegramFirstName: telegramUser.first_name,
          telegramUsername: telegramUser.username || null,
          telegramPhoto: telegramUser.photo_url || null,
          telegramLinkedAt: new Date(),
          emailVerified: new Date(),
          role: userRole,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          telegramId: true,
          telegramUsername: true,
          telegramFirstName: true,
          telegramPhoto: true,
          telegramLinkedAt: true,
          role: true,
        },
      });
    } else {
      // Mettre à jour les infos Telegram mais NE PAS changer le role
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          telegramFirstName: telegramUser.first_name,
          telegramUsername: telegramUser.username || null,
          telegramPhoto: telegramUser.photo_url || null,
        },
      });
    }

    const isAdmin =
      isBotAdminUser ||
      (await prisma.telegramAdmin.findFirst({
        where: { telegramId: telegramIdStr, isActive: true },
      })) !== null;

    return NextResponse.json({
      success: true,
      telegramInfo: {
        linked: !!user.telegramId,
        telegramId: user.telegramId,
        telegramUsername: user.telegramUsername,
        telegramFirstName: user.telegramFirstName,
        telegramPhoto: user.telegramPhoto,
        linkedAt: user.telegramLinkedAt?.toISOString() ?? null,
        isAdmin,
      },
    });
  } catch (error) {
    console.error('[telegram/me] Error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
