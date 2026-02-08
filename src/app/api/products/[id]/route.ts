import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAdminAccess } from '@/lib/check-admin-access';
import { productUpdateSchema, productPatchSchema, validateAndSanitize, formatZodErrors, validateId } from '@/lib/validation';

// GET - Récupérer un produit par ID
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { name: true } },
        variants: {
          orderBy: [
            { type: 'asc' },
            { name: 'asc' }
          ]
        }
      }
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Produit non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement du produit' },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour un produit (remplacement complet)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await checkAdminAccess(request))) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    if (!validateId(id, 'productId')) {
      return NextResponse.json({ error: 'ID produit invalide' }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 });
    }

    const validation = validateAndSanitize(productUpdateSchema, body, ['title', 'description', 'tag']);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: formatZodErrors(validation.errors) },
        { status: 400 }
      );
    }
    const data = validation.data;

    // Utilisation d'une transaction pour mettre à jour le produit et ses variantes
    const product = await prisma.$transaction(async (tx) => {
      // 1. Mise à jour des champs du produit
      await tx.product.update({
        where: { id },
        data: {
          title: data.title,
          description: data.description,
          basePrice: data.basePrice ?? null,
          tag: data.tag ?? null,
          image: data.image ?? null,
          videoUrl: data.videoUrl ?? null,
          section: data.section,
          categoryId: data.categoryId ?? null,
          featuredInRecent: data.featuredInRecent ?? undefined,
          featuredInTrending: data.featuredInTrending ?? undefined,
        },
      });

      // 2. Gestion des variantes (si fournies)
      if (data.variants && data.variants.length > 0) {
        await tx.productVariant.deleteMany({
          where: { productId: id }
        });
        await tx.productVariant.createMany({
          data: data.variants.map((v) => ({
            productId: id,
            name: v.name,
            type: v.type,
            unit: v.unit ?? null,
            price: v.price,
            power: v.power ?? null,
            capacity: v.capacity ?? null,
            resistance: v.resistance ?? null,
          }))
        });
      } else if (data.variants && data.variants.length === 0) {
        await tx.productVariant.deleteMany({
          where: { productId: id }
        });
      }

      // Retourner le produit mis à jour avec ses variantes
      return tx.product.findUnique({
        where: { id },
        include: { variants: true }
      });
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du produit' },
      { status: 500 }
    );
  }
}

// PATCH - Mise à jour partielle d'un produit
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await checkAdminAccess(request))) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    if (!validateId(id, 'productId')) {
      return NextResponse.json({ error: 'ID produit invalide' }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 });
    }

    const validation = validateAndSanitize(productPatchSchema, body, ['title', 'description', 'tag']);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: formatZodErrors(validation.errors) },
        { status: 400 }
      );
    }
    const data = validation.data;

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.basePrice !== undefined) updateData.basePrice = data.basePrice;
    if (data.tag !== undefined) updateData.tag = data.tag;
    if (data.image !== undefined) updateData.image = data.image;
    if (data.videoUrl !== undefined) updateData.videoUrl = data.videoUrl;
    if (data.section !== undefined) updateData.section = data.section;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(product);
  } catch (error: unknown) {
    console.error('Error patching product:', error);
    const msg = error instanceof Error ? error.message : 'Erreur lors de la mise à jour du produit';
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un produit
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await checkAdminAccess(request))) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    if (!validateId(id, 'productId')) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
    }

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du produit' },
      { status: 500 }
    );
  }
}
