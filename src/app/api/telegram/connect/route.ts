import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateTelegramWebAppData } from '@/lib/telegram-webapp';

/**
 * POST /api/telegram/connect
 * Connexion directe via initData Telegram. Crée la session et pose le cookie.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const initData = typeof body?.initData === 'string' ? body.initData : '';
    if (!initData) {
      return NextResponse.json({ error: 'initData requis' }, { status: 400 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'Configuration manquante' }, { status: 500 });
    }

    const telegramUser = validateTelegramWebAppData(initData, botToken);
    if (!telegramUser) {
      return NextResponse.json({ error: 'Données Telegram invalides' }, { status: 400 });
    }

    const { isBotAdmin } = await import('@/lib/bot-admins');
    const isBotAdminUser = isBotAdmin(telegramUser.id.toString());
    const userRole = isBotAdminUser ? 'ADMIN' : 'USER';

    let user = await prisma.user.findFirst({
      where: { telegramId: telegramUser.id.toString() },
    });

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          telegramFirstName: telegramUser.first_name,
          telegramUsername: telegramUser.username || null,
          telegramPhoto: telegramUser.photo_url || null,
          ...(isBotAdminUser ? { role: 'ADMIN' } : {}),
        },
      });
    } else {
      const newUserEmail = `telegram_${telegramUser.id}@miniapp.local`;
      const existingEmailUser = await prisma.user.findUnique({
        where: { email: newUserEmail },
      });

      if (existingEmailUser) {
        await prisma.user.update({
          where: { id: existingEmailUser.id },
          data: {
            telegramId: telegramUser.id.toString(),
            telegramFirstName: telegramUser.first_name,
            telegramUsername: telegramUser.username || null,
            telegramPhoto: telegramUser.photo_url || null,
            lastLoginAt: new Date(),
            ...(isBotAdminUser ? { role: 'ADMIN' } : {}),
          },
        });
        user = await prisma.user.findUnique({ where: { id: existingEmailUser.id } })!;
      } else {
        user = await prisma.user.create({
          data: {
            email: newUserEmail,
            name: `${telegramUser.first_name}${telegramUser.last_name ? ' ' + telegramUser.last_name : ''}`,
            image: telegramUser.photo_url || null,
            telegramId: telegramUser.id.toString(),
            telegramFirstName: telegramUser.first_name,
            telegramUsername: telegramUser.username || null,
            telegramPhoto: telegramUser.photo_url || null,
            telegramLinkedAt: new Date(),
            emailVerified: new Date(),
            role: userRole,
            status: 'ACTIVE',
          },
        });
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Erreur utilisateur' }, { status: 500 });
    }

    const cookie = await createSessionCookie(user);
    const res = NextResponse.json({ success: true, userId: user.id });
    if (cookie) res.headers.append('Set-Cookie', cookie);
    return res;
  } catch (error) {
    console.error('[telegram/connect]', error);
    return NextResponse.json({ error: 'Erreur connexion' }, { status: 500 });
  }
}

async function createSessionCookie(user: { id: string; email: string | null; name: string | null; image: string | null; role: string }) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return '';

  try {
    const jwt = await import('next-auth/jwt');
    const encode = (jwt as { encode?: (o: { token: object; secret: string; maxAge?: number }) => Promise<string> }).encode;
    if (!encode) return '';

    const now = Math.floor(Date.now() / 1000);
    const maxAge = 30 * 24 * 60 * 60;
    const token = await encode({
      secret,
      token: {
        sub: user.id,
        email: user.email || '',
        name: user.name || '',
        picture: user.image || '',
        userId: user.id,
        role: user.role,
        iat: now,
        exp: now + maxAge,
      },
      maxAge,
    });

    const isProd = process.env.NODE_ENV === 'production';
    const cookieName = isProd ? '__Secure-next-auth.session-token' : 'next-auth.session-token';
    const sameSite = isProd ? 'None' : 'Lax';
    return `${cookieName}=${token}; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=${maxAge}${isProd ? '; Secure' : ''}`;
  } catch (e) {
    console.error('[telegram/connect] createSessionCookie:', e);
    return '';
  }
}
