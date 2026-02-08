import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** POST /api/products/[id]/like - Incrémente le like (sans auth, simple compteur) */
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

    await prisma.product.update({
      where: { id },
      data: { likesCount: { increment: 1 } },
    });

    const updated = await prisma.product.findUnique({
      where: { id },
      select: { likesCount: true },
    });
    return NextResponse.json({ likesCount: updated?.likesCount ?? product.likesCount + 1 });
  } catch (error) {
    console.error('Error liking product:', error);
    return NextResponse.json(
      { error: 'Erreur lors du like' },
      { status: 500 }
    );
  }
}
