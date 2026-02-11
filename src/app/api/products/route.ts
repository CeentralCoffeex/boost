import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAdminAccess } from '@/lib/check-admin-access';
import { requireTelegramOrAdminOr403 } from '@/lib/require-telegram-app';
import { signProductsUrls } from '@/lib/upload-sign';
import { productCreateSchema, validateAndSanitize, formatZodErrors } from '@/lib/validation';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  const forbidden = await requireTelegramOrAdminOr403(request, checkAdminAccess);
  if (forbidden) return forbidden;
  try {
    const { searchParams } = new URL(request.url);
    const usePagination = searchParams.has('page') || searchParams.has('limit');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      (prisma.product as any).findMany({
        ...(usePagination && { skip, take: limit }),
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
      }),
      usePagination ? (prisma.product as any).count() : Promise.resolve(0)
    ]);

    const signed = signProductsUrls(products as { image?: string | null; videoUrl?: string | null }[]);
    if (!usePagination) {
      const response = NextResponse.json(signed);
      response.headers.set('Cache-Control', 'no-store, max-age=0');
      return response;
    }
    const totalCount = total as number;
    const totalPages = Math.ceil(totalCount / limit);
    const response = NextResponse.json({
      data: signed,
      total: totalCount,
      page,
      limit,
      totalPages
    });
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
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

    const validation = validateAndSanitize(productCreateSchema, body, ['title', 'tag']);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: formatZodErrors(validation.errors) },
        { status: 400 }
      );
    }
    const data = validation.data;

    const defaultUnit = data.defaultUnit === 'ml' ? 'none' : (data.defaultUnit ?? null);
    const product = await (prisma.product as any).create({
      data: {
        title: data.title,
        description: data.description,
        basePrice: data.basePrice ?? null,
        tag: data.tag ?? null,
        image: data.image ?? null,
        videoUrl: data.videoUrl ?? null,
        section: data.section,
        defaultUnit,
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
