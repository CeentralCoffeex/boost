import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAdminAccess } from '@/lib/check-admin-access';
import { requireTelegramOrAdminOr403 } from '@/lib/require-telegram-app';
import { signCategoryProducts } from '@/lib/upload-sign';
import { categoryUpdateSchema, validateAndSanitize, formatZodErrors, validateId } from '@/lib/validation';

async function checkAuth(request: NextRequest) {
  try {
    return await checkAdminAccess(request);
  } catch (error) {
    console.error('[AuthCheck ID] Error:', error);
    return false;
  }
}

// GET - Récupérer une catégorie avec ses produits (par id ou url)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const forbidden = await requireTelegramOrAdminOr403(request, checkAuth);
  if (forbidden) return forbidden;
  try {
    const { id } = await params;
    const raw = String(id || '').trim().replace(/^\/+/, '');
    if (!raw) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 });
    }

    let category = await prisma.category.findFirst({
      where: {
        OR: [
          { id: raw },
          { url: raw },
          { url: '/' + raw }
        ]
      },
      include: {
        parent: { select: { id: true, name: true } },
        subcategories: { orderBy: { order: 'asc' } },
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
      const normalize = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const paramNorm = normalize(raw);
      const lightList = await prisma.category.findMany({
        where: { isActive: true, parentId: null },
        select: { id: true, url: true, name: true }
      });
      const matched = lightList.find(c => normalize(c.url) === paramNorm || normalize(c.name) === paramNorm);
      if (matched) {
        category = await prisma.category.findFirst({
          where: { id: matched.id },
          include: {
            parent: { select: { id: true, name: true } },
            subcategories: { orderBy: { order: 'asc' } },
            products: {
              orderBy: { createdAt: 'desc' },
              include: {
                variants: { orderBy: [{ type: 'asc' }, { name: 'asc' }] }
              }
            }
          }
        });
      }
    }

    if (!category) {
      return NextResponse.json(
        { error: 'Catégorie non trouvée' },
        { status: 404 }
      );
    }

    // Si c'est une catégorie parente avec sous-catégories, inclure les produits des sous-catégories
    const subcategories = category.subcategories || [];
    if (subcategories.length > 0) {
      const subIds = subcategories.map((s: { id: string }) => s.id);
      const subProducts = await prisma.product.findMany({
        where: { categoryId: { in: subIds } },
        orderBy: { createdAt: 'desc' },
        include: {
          variants: { orderBy: [{ type: 'asc' }, { name: 'asc' }] }
        }
      });
      const existingIds = new Set((category.products || []).map((p: { id: string }) => p.id));
      const combined = [
        ...(category.products || []),
        ...subProducts.filter((p) => !existingIds.has(p.id))
      ];
      (category as any).products = combined.sort(
        (a: { createdAt: Date }, b: { createdAt: Date }) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    const signed = signCategoryProducts(category as { products?: { image?: string | null; videoUrl?: string | null }[] });
    const response = NextResponse.json(signed);
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la catégorie' },
      { status: 500 }
    );
  }
}

// PUT - Modifier une catégorie
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!await checkAuth(request)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    if (!validateId(id, 'categoryId')) {
      return NextResponse.json({ error: 'ID catégorie invalide' }, { status: 400 });
    }

    const contentType = request.headers.get('content-type') || '';
    let body: unknown;
    if (contentType.includes('application/json')) {
      body = await request.json();
    } else if (contentType.includes('multipart/form-data')) {
      const fd = await request.formData();
      body = {
        name: fd.get('name') ? String(fd.get('name')) : undefined,
        subtitle: fd.get('subtitle') ? String(fd.get('subtitle')) : undefined,
        icon: fd.get('icon') ? String(fd.get('icon')) : null,
        backgroundColor: String(fd.get('backgroundColor') || '#000000'),
        url: fd.get('url') ? String(fd.get('url')) : undefined,
        order: Number(fd.get('order') || 0),
        isActive: (fd.get('isActive') ?? 'true') === 'true',
        parentId: fd.get('parentId') ? String(fd.get('parentId')) : null
      };
    } else {
      body = await request.json().catch(() => ({}));
    }

    const validation = validateAndSanitize(categoryUpdateSchema, body, ['name', 'url']);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: formatZodErrors(validation.errors) },
        { status: 400 }
      );
    }
    body = validation.data;

    const normalize = (s: string) =>
      s.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    const updateData: any = {};

    // Garantir un nom unique : si doublon (autre catégorie), ajouter (2), (3), etc.
    if (body.name !== undefined) {
      let newName = String(body.name).trim();
      const existingNames = await prisma.category.findMany({
        where: { NOT: { id } },
        select: { name: true }
      });
      const usedNames = new Set(existingNames.map(c => c.name.trim().toLowerCase()));
      let uniqueName = newName;
      let suffix = 2;
      while (usedNames.has(uniqueName.trim().toLowerCase())) {
        const base = newName.replace(/\s*\(\d+\)\s*$/, '').trim();
        uniqueName = `${base} (${suffix})`;
        suffix++;
      }
      updateData.name = uniqueName;
    }
    if (body.subtitle !== undefined) updateData.subtitle = String(body.subtitle);
    if (body.icon !== undefined) updateData.icon = body.icon ? String(body.icon) : null;
    if (body.backgroundColor !== undefined) updateData.backgroundColor = String(body.backgroundColor || '#000000');
    if (body.url !== undefined) {
      const raw = String(body.url || '');
      if (raw.trim() !== '') {
        const clean = '/' + normalize(raw.replace(/^\//, ''));
        updateData.url = clean;
      }
    }
    if (body.order !== undefined) updateData.order = typeof body.order === 'number' ? body.order : Number(body.order || 0);
    if (body.isActive !== undefined) updateData.isActive = !!body.isActive;
    if (body.parentId !== undefined) updateData.parentId = body.parentId ? String(body.parentId).trim() || null : null;

    const exists = await prisma.category.findUnique({ where: { id } });
    if (!exists) {
      return NextResponse.json(
        { error: 'Catégorie non trouvée' },
        { status: 404 }
      );
    }
    if (updateData.url) {
      const duplicate = await prisma.category.findFirst({ where: { url: updateData.url, NOT: { id: id } } });
      if (duplicate) {
        return NextResponse.json(
          { error: 'URL déjà utilisée par une autre catégorie' },
          { status: 409 }
        );
      }
    }

    const subcategoriesPayload = Array.isArray(body.subcategories) ? body.subcategories : [];
    const isParent = exists.parentId === null;

    const category = await prisma.$transaction(async (tx) => {
      const updated = await tx.category.update({
        where: { id },
        data: updateData,
      });

      if (isParent && subcategoriesPayload.length >= 0) {
        const normalizeSub = (s: string) =>
          s.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        const existingSubs = await tx.category.findMany({
          where: { parentId: id },
          select: { id: true }
        });
        const existingIds = new Set(existingSubs.map((s) => s.id));
        const incomingIds = new Set(subcategoriesPayload.filter((s: { id?: string }) => s.id).map((s: { id: string }) => s.id));

        const updates: Promise<unknown>[] = [];
        const toCreate: { name: string; subUrl: string }[] = [];
        const allUrls = await tx.category.findMany({ select: { url: true } }).then((r) => new Set(r.map((c) => c.url)));

        for (const sub of subcategoriesPayload) {
          const name = String(sub.name || '').trim();
          if (!name) continue;
          const subUrl = '/' + normalizeSub(name);
          if (sub.id && existingIds.has(sub.id)) {
            updates.push(tx.category.update({
              where: { id: sub.id },
              data: { name, url: subUrl, subtitle: name }
            }));
          } else if (!sub.id) {
            let uniqueUrl = subUrl;
            let suffix = 2;
            while (allUrls.has(uniqueUrl)) {
              uniqueUrl = `${subUrl}-${suffix}`;
              suffix++;
            }
            allUrls.add(uniqueUrl);
            toCreate.push({ name, subUrl: uniqueUrl });
          }
        }
        await Promise.all(updates);
        for (const { name, subUrl } of toCreate) {
          await tx.category.create({
            data: {
              name,
              subtitle: name,
              url: subUrl,
              parentId: id,
              order: 0,
              isActive: true,
              backgroundColor: exists.backgroundColor || '#000000'
            }
          });
        }
        const toRemove = Array.from(existingIds).filter((oldId) => !incomingIds.has(oldId));
        for (const oldId of toRemove) {
          await tx.product.updateMany({ where: { categoryId: oldId }, data: { categoryId: null } });
          await tx.category.delete({ where: { id: oldId } });
        }
      }

      return updated;
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la catégorie: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer une catégorie
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!await checkAuth(request)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    if (!validateId(id, 'categoryId')) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
    }

    // Force refresh check
    const exists = await (prisma.category as any).findUnique({ where: { id } });
    if (!exists) {
      return NextResponse.json(
        { error: 'Catégorie non trouvée' },
        { status: 404 }
      );
    }

    // Utilisation d'une transaction pour désassocier les produits puis supprimer la catégorie
    await prisma.$transaction(async (tx: any) => {
      // Mettre à null le categoryId des produits liés
      await tx.product.updateMany({
        where: { categoryId: id },
        data: { categoryId: null }
      });
      // Supprimer la catégorie
      await tx.category.delete({
        where: { id }
      });
    });

    console.log('[Categories DELETE] Deleted:', id);
    return NextResponse.json({ success: true, message: 'Catégorie supprimée' });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la catégorie: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
