import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAdminAccess } from '@/lib/check-admin-access';
import { productCreateSchema, validateAndSanitize, formatZodErrors } from '@/lib/validation';

export async function GET() {
  try {
    const products = await (prisma.product as any).findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        category: {
          include: { parent: { select: { id: true, name: true } } }
        },
        variants: {
          orderBy: [
            { type: 'asc' },
            { name: 'asc' }
          ]
        }
      }
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement des produits' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await checkAdminAccess(request))) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 });
    }

    const validation = validateAndSanitize(productCreateSchema, body, ['title', 'description', 'tag']);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: formatZodErrors(validation.errors) },
        { status: 400 }
      );
    }
    const data = validation.data;

    const product = await (prisma.product as any).create({
      data: {
        title: data.title,
        description: data.description,
        basePrice: data.basePrice ?? null,
        tag: data.tag ?? null,
        image: data.image ?? null,
        videoUrl: data.videoUrl ?? null,
        section: data.section,
        categoryId: data.categoryId ?? null,
        variants: {
          create: (data.variants || []).map((v) => ({
            name: v.name,
            type: v.type,
            unit: v.unit ?? null,
            price: v.price,
            power: v.power ?? null,
            capacity: v.capacity ?? null,
            resistance: v.resistance ?? null,
          }))
        }
      },
      include: {
        variants: true
      }
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du produit' },
      { status: 500 }
    );
  }
}
