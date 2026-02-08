import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAdminAccess } from '@/lib/check-admin-access';
import { sliderCreateSchema, validateAndSanitize, formatZodErrors } from '@/lib/validation';

async function checkAuth(request: NextRequest) {
  try {
    return await checkAdminAccess(request);
  } catch (error) {
    console.error('[Slider AuthCheck] Error:', error);
    return false;
  }
}

// GET - Récupérer toutes les images du slider
export async function GET() {
  try {
    const images = await prisma.sliderImage.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(images);
  } catch (error) {
    console.error('Error fetching slider images:', error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement des images' },
      { status: 500 }
    );
  }
}

// POST - Créer ou mettre à jour une image du slider
export async function POST(request: NextRequest) {
  try {
    if (!await checkAuth(request)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 });
    }

    const validation = validateAndSanitize(sliderCreateSchema, body, ['title', 'subtitle']);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: formatZodErrors(validation.errors) },
        { status: 400 }
      );
    }
    const data = validation.data;

    const image = await prisma.sliderImage.create({
      data: {
        title: data.title,
        subtitle: data.subtitle,
        image: data.image,
        order: data.order,
        isActive: data.isActive,
      },
    });

    console.log('[Slider POST] Created:', image.id);
    return NextResponse.json(image);
  } catch (error) {
    console.error('Error creating slider image:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'image: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
