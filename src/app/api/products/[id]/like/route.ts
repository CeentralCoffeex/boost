import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateTelegramWebAppData } from '@/lib/telegram-webapp';

/** GET /api/products/[id]/like - Vérifie si l'utilisateur a liké */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    // Récupérer l'utilisateur (session ou initData)
    const session = await getServerSession(authOptions);
    let userId = session?.user?.id;

    if (!userId) {
      const authHeader = request.headers.get('authorization');
      const initData = authHeader?.startsWith('tma ') 
        ? authHeader.substring(4) 
        : request.headers.get('x-telegram-init-data');

      if (initData) {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (botToken) {
          const telegramUser = validateTelegramWebAppData(initData, botToken);
          if (telegramUser) {
            const user = await prisma.user.findUnique({
              where: { telegramId: telegramUser.id.toString() },
              select: { id: true },
            });
            userId = user?.id;
          }
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ liked: false });
    }

    // Vérifier si l'utilisateur a liké
    const like = await prisma.productLike.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: id,
        },
      },
    });

    return NextResponse.json({ liked: !!like });
  } catch (error) {
    console.error('Error checking like:', error);
    return NextResponse.json({ liked: false });
  }
}

/** POST /api/products/[id]/like - Ajoute un like si l'utilisateur n'a pas déjà liké */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    // Récupérer l'utilisateur (session ou initData)
    const session = await getServerSession(authOptions);
    let userId = session?.user?.id;

    if (!userId) {
      const authHeader = request.headers.get('authorization');
      const initData = authHeader?.startsWith('tma ') 
        ? authHeader.substring(4) 
        : request.headers.get('x-telegram-init-data');

      if (initData) {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (botToken) {
          const telegramUser = validateTelegramWebAppData(initData, botToken);
          if (telegramUser) {
            const user = await prisma.user.findUnique({
              where: { telegramId: telegramUser.id.toString() },
              select: { id: true },
            });
            userId = user?.id;
          }
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ error: 'Produit non trouvé' }, { status: 404 });
    }

    // Vérifier si l'utilisateur a déjà liké
    const existingLike = await prisma.productLike.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: id,
        },
      },
    });

    if (existingLike) {
      return NextResponse.json({ error: 'Déjà liké', alreadyLiked: true }, { status: 400 });
    }

    // Créer le like et incrémenter le compteur
    await prisma.$transaction([
      prisma.productLike.create({
        data: {
          userId,
          productId: id,
        },
      }),
      prisma.product.update({
        where: { id },
        data: { likesCount: { increment: 1 } },
      }),
    ]);

    const updated = await prisma.product.findUnique({
      where: { id },
      select: { likesCount: true },
    });

    return NextResponse.json({ 
      success: true, 
      likesCount: updated?.likesCount ?? product.likesCount + 1 
    });
  } catch (error) {
    console.error('Error liking product:', error);
    return NextResponse.json(
      { error: 'Erreur lors du like' },
      { status: 500 }
    );
  }
}
