import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isBotAdmin } from '@/lib/bot-admins';

// GET - Vérifier si un utilisateur Telegram est administrateur
// Query params: telegramId ou username
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const telegramId = searchParams.get('telegramId');
    const username = searchParams.get('username');

    if (!telegramId && !username) {
      return NextResponse.json(
        { error: 'telegramId ou username requis' },
        { status: 400 }
      );
    }

    // Admins du bot = admins par défaut sur le site
    if (telegramId && isBotAdmin(telegramId)) {
      return NextResponse.json({
        isAdmin: true,
        admin: {
          telegramId,
          username: null,
          firstName: null,
          lastName: null,
          isActive: true,
        },
      });
    }

    let admin;

    if (telegramId) {
      admin = await prisma.telegramAdmin.findUnique({
        where: { telegramId },
      });
    } else if (username) {
      admin = await prisma.telegramAdmin.findFirst({
        where: {
          username: username.replace('@', ''),
        },
      });
    }

    if (!admin) {
      return NextResponse.json(
        {
          isAdmin: false,
          message: 'Utilisateur non trouvé',
        }
      );
    }

    return NextResponse.json({
      isAdmin: admin.isActive,
      admin: {
        id: admin.id,
        telegramId: admin.telegramId,
        username: admin.username,
        firstName: admin.firstName,
        lastName: admin.lastName,
        isActive: admin.isActive,
      }
    });
  } catch (error) {
    console.error('Error checking telegram admin:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification' },
      { status: 500 }
    );
  }
}
