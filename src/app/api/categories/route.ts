import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAdminAccess } from '@/lib/check-admin-access';
import { requireTelegramOrAdminOr403 } from '@/lib/require-telegram-app';
import { signCategoryProducts } from '@/lib/upload-sign';
import { categoryCreateSchema, validateAndSanitize, formatZodErrors } from '@/lib/validation';

async function checkAuth(request: NextRequest) {
  try {
    return await checkAdminAccess(request);
  } catch (error) {
    console.error('[AuthCheck] Error:', error);
    return false;
  }
}

// GET - Récupérer toutes les catégories ou une catégorie par id/url
export async function GET(request: NextRequest) {
  const forbidden = await requireTelegramOrAdminOr403(request, checkAuth);
  if (forbidden) return forbidden;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const url = searchParams.get('url');

    if (id || url) {
      const raw = (url || id || '').trim().replace(/^\/+/, '');
      if (!raw) return NextResponse.json({ error: 'Paramètre manquant' }, { status: 400 });
      let category = await prisma.category.findFirst({
        where: {
          OR: [
            { id: raw },
            { url: raw },
            { url: '/' + raw }
          ]
        },
        include: {
          products: {
            orderBy: { createdAt: 'desc' },
            include: {
              variants: {
                orderBy: [
                  { type: 'asc' },
                  { name: 'asc' }
                ]
              }
            }
          }
        }
      });
      if (!category) {
        // Fallback: essayer via le nom normalisé (slug)
        const param = raw.toLowerCase().trim();
        const all = await prisma.category.findMany({
          where: { isActive: true },
          include: { products: { orderBy: { createdAt: 'desc' }, include: { variants: { orderBy: [{ type: 'asc' }, { name: 'asc' }] } } } }
        });
        const normalize = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        category = all.find(c => normalize(c.url) === normalize(param) || normalize(c.name) === normalize(param)) || null;
      }
      if (!category) return NextResponse.json({ error: 'Catégorie non trouvée' }, { status: 404 });
      return NextResponse.json(signCategoryProducts(category as { products?: { image?: string | null; videoUrl?: string | null }[] }));
    }

    const allParam = searchParams.get('all');
    const wantAll = allParam === '1' || allParam === 'true';
    const whereClause = wantAll ? {} : { isActive: true };
    if (wantAll && !(await checkAuth(request))) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const usePagination = searchParams.has('page') || searchParams.has('limit');
    const DEFAULT_LIMIT_CAT = 20;
    const MAX_LIMIT_CAT = 100;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(MAX_LIMIT_CAT, Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT_CAT), 10) || DEFAULT_LIMIT_CAT));
    const skip = (page - 1) * limit;

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where: wantAll ? whereClause : { ...whereClause, parentId: null },
        orderBy: { order: 'asc' },
        ...(usePagination && { skip, take: limit }),
        include: wantAll ? { subcategories: { orderBy: { order: 'asc' } } } : undefined,
      }),
      usePagination ? prisma.category.count({ where: wantAll ? whereClause : { ...whereClause, parentId: null } }) : Promise.resolve(0)
    ]);

    if (!usePagination) {
      const response = NextResponse.json(categories);
      response.headers.set('Cache-Control', 'no-store, max-age=0');
      return response;
    }
    const totalPages = Math.ceil((total as number) / limit);
    const response = NextResponse.json({
      data: categories,
      total: total as number,
      page,
      limit,
      totalPages
    });
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement des catégories' },
      { status: 500 }
    );
  }
}

// POST - Créer une catégorie
export async function POST(request: NextRequest) {
  try {
    if (!await checkAuth(request)) {
      console.warn('[Categories POST] Unauthorized access attempt');
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    let body: unknown;
    if (contentType.includes('application/json')) {
      body = await request.json();
    } else if (contentType.includes('multipart/form-data')) {
      const fd = await request.formData();
      body = {
        name: String(fd.get('name') || ''),
        subtitle: String(fd.get('subtitle') || ''),
        icon: fd.get('icon') ? String(fd.get('icon')) : null,
        backgroundColor: String(fd.get('backgroundColor') || '#000000'),
        url: String(fd.get('url') || ''),
        order: Number(fd.get('order') || 0),
        isActive: (fd.get('isActive') ?? 'true') === 'true',
        parentId: fd.get('parentId') ? String(fd.get('parentId')) : null,
        subcategories: [],
      };
    } else {
      body = await request.json().catch(() => ({}));
    }

    const validation = validateAndSanitize(categoryCreateSchema, body, ['name', 'url']);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: formatZodErrors(validation.errors) },
        { status: 400 }
      );
    }
    let { name, subtitle, icon, backgroundColor, url: urlInput, order, isActive, parentId, subcategories: subcategoriesPayload } = validation.data;

    const normalize = (s: string) =>
      s.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    // Garantir un nom unique : si doublon, ajouter (2), (3), etc.
    const existingNames = await prisma.category.findMany({ select: { name: true } });
    const usedNames = new Set(existingNames.map(c => c.name.trim().toLowerCase()));
    let uniqueName = name;
    let suffix = 2;
    while (usedNames.has(uniqueName.trim().toLowerCase())) {
      const base = name.replace(/\s*\(\d+\)\s*$/, '').trim();
      uniqueName = `${base} (${suffix})`;
      suffix++;
    }
    name = uniqueName;

    let url = String(urlInput || '').trim();
    if (!url) {
      url = '/' + normalize(name);
    } else {
      const clean = normalize(url.replace(/^\//, ''));
      url = '/' + clean;
    }

    // Si l'URL existe déjà, auto-incrémenter avec (2), (3), etc.
    let uniqueUrl = url;
    let urlSuffix = 2;
    while (await prisma.category.findFirst({ where: { url: uniqueUrl } })) {
      uniqueUrl = url.replace(/(\/?)([^/]*)$/, `$1$2-${urlSuffix}`);
      urlSuffix++;
    }
    url = uniqueUrl;

    const category = await prisma.category.create({
      data: {
        name,
        subtitle,
        icon: icon || null,
        backgroundColor,
        url,
        order,
        isActive,
        parentId: parentId || null,
      },
    });

    // Créer les sous-catégories si fournies (uniquement pour catégories principales)
    if (parentId === null && subcategoriesPayload && subcategoriesPayload.length > 0) {
      const bgColor = backgroundColor;
      for (const sub of subcategoriesPayload) {
        const subName = String(sub.name || '').trim();
        if (!subName) continue;
        const subUrl = '/' + normalize(subName);
        let uniqueSubUrl = subUrl;
        let suffix = 2;
        while (await prisma.category.findFirst({ where: { url: uniqueSubUrl } })) {
          uniqueSubUrl = `${subUrl}-${suffix}`;
          suffix++;
        }
        await prisma.category.create({
          data: {
            name: subName,
            subtitle: subName,
            url: uniqueSubUrl,
            parentId: category.id,
            order: 0,
            isActive: true,
            backgroundColor: bgColor,
          },
        });
      }
    }

    console.log('[Categories POST] Created:', category.id);
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la catégorie: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
