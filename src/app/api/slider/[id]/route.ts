import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAdminAccess } from '@/lib/check-admin-access';
import { sliderUpdateSchema, validateAndSanitize, formatZodErrors, validateId } from '@/lib/validation';
import { getSafeErrorMessage, logApiError } from '@/lib/api-error';

async function checkAuth(request: NextRequest) {
  try {
    return await checkAdminAccess(request);
  } catch (error) {
    console.error('[Slider AuthCheck ID] Error:', error);
    return false;
  }
}

// PUT - Mettre à jour une image du slider
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!await checkAuth(request)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    if (!validateId(id, 'sliderId')) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 });
    }

    const validation = validateAndSanitize(sliderUpdateSchema, body, ['title', 'subtitle']);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: formatZodErrors(validation.errors) },
        { status: 400 }
      );
    }
    const data = validation.data;

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.subtitle !== undefined) updateData.subtitle = data.subtitle;
    if (data.image !== undefined) updateData.image = data.image;
    if (data.order !== undefined) updateData.order = data.order;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Aucune donnée à mettre à jour' }, { status: 400 });
    }

    const image = await prisma.sliderImage.update({
      where: { id },
      data: updateData,
    });

    console.log('[Slider PUT] Updated:', id);
    return NextResponse.json(image);
  } catch (error) {
    logApiError('Slider PUT', error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer une image du slider
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!await checkAuth(request)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    if (!validateId(id, 'sliderId')) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
    }

    await prisma.sliderImage.delete({
      where: { id },
    });

    console.log('[Slider DELETE] Deleted:', id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logApiError('Slider DELETE', error);
    // Gérer le cas où l'enregistrement n'existe pas (Prisma P2025) — pas de fuite d'info, code connu
    if (error?.code === 'P2025' || error?.message?.includes('Record to delete does not exist')) {
      return NextResponse.json({ error: 'Image introuvable' }, { status: 404 });
    }
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500 }
    );
  }
}
