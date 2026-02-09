import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateTelegramWebAppData } from '@/lib/telegram-webapp';

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : null;
  return ip || request.headers.get('x-real-ip') || '0.0.0.0';
}

/** Résout l'identité : userId (Telegram) si dispo, sinon null (on utilisera l'IP) */
async function resolveUserId(request: NextRequest): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) return session.user.id;

  const authHeader = request.headers.get('authorization');
  const initData =
    authHeader?.startsWith('tma ') ? authHeader.substring(4) : request.headers.get('x-telegram-init-data');

  if (!initData) return null;

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return null;

  const telegramUser = validateTelegramWebAppData(initData, botToken);
  if (!telegramUser) return null;

  let user = await prisma.user.findUnique({
    where: { telegramId: telegramUser.id.toString() },
    select: { id: true },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        telegramId: telegramUser.id.toString(),
        name: telegramUser.first_name || 'User',
        role: 'USER',
      },
      select: { id: true },
    });
  }

  return user?.id ?? null;
}

/** GET /api/products/[id]/like - Vérifie si l'utilisateur a liké (Telegram ou IP) */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    const userId = await resolveUserId(request);

    if (userId) {
      const like = await prisma.productLike.findUnique({
        where: {
          userId_productId: { userId, productId: id },
        },
      });
      return NextResponse.json({ liked: !!like });
    }

    const ip = getClientIp(request);
    const likeByIp = await prisma.productLikeByIp.findUnique({
      where: {
        productId_ip: { productId: id, ip },
      },
    });
    return NextResponse.json({ liked: !!likeByIp });
  } catch (error) {
    console.error('Error checking like:', error);
    return NextResponse.json({ liked: false });
  }
}

/** POST /api/products/[id]/like - Un like par produit par utilisateur (Telegram) ou par IP */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ error: 'Produit non trouvé' }, { status: 404 });
    }

    const userId = await resolveUserId(request);

    if (userId) {
      const existingLike = await prisma.productLike.findUnique({
        where: {
          userId_productId: { userId, productId: id },
        },
      });
      if (existingLike) {
        const updated = await prisma.product.findUnique({
          where: { id },
          select: { likesCount: true },
        });
        return NextResponse.json({
          error: 'Déjà liké',
          alreadyLiked: true,
          likesCount: updated?.likesCount ?? product.likesCount,
        }, { status: 400 });
      }

      await prisma.$transaction([
        prisma.productLike.create({
          data: { userId, productId: id },
        }),
        prisma.product.update({
          where: { id },
          data: { likesCount: { increment: 1 } },
        }),
      ]);
    } else {
      const ip = getClientIp(request);
      const existingByIp = await prisma.productLikeByIp.findUnique({
        where: {
          productId_ip: { productId: id, ip },
        },
      });
      if (existingByIp) {
        const updated = await prisma.product.findUnique({
          where: { id },
          select: { likesCount: true },
        });
        return NextResponse.json({
          error: 'Déjà liké',
          alreadyLiked: true,
          likesCount: updated?.likesCount ?? product.likesCount,
        }, { status: 400 });
      }

      await prisma.$transaction([
        prisma.productLikeByIp.create({
          data: { productId: id, ip },
        }),
        prisma.product.update({
          where: { id },
          data: { likesCount: { increment: 1 } },
        }),
      ]);
    }

    const updated = await prisma.product.findUnique({
      where: { id },
      select: { likesCount: true },
    });

    return NextResponse.json({
      success: true,
      likesCount: updated?.likesCount ?? product.likesCount + 1,
    });
  } catch (error) {
    console.error('Error liking product:', error);
    return NextResponse.json(
      { error: 'Erreur lors du like' },
      { status: 500 }
    );
  }
}
