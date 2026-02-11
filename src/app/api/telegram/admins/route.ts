import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { getServerSession } from 'next-auth';
import { getBotConfigPath } from '@/lib/bot-admins';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkAdminAccess, invalidateAdminCacheForTelegramId } from '@/lib/check-admin-access';
import { telegramAdminCreateSchema, validateAndSanitize, formatZodErrors } from '@/lib/validation';
import { addAdminIdToConfig, removeAdminIdFromConfig } from '@/lib/sync-bot-config';

// GET - Récupérer tous les administrateurs (DB + config.json)
export async function GET(request: NextRequest) {
  try {
    if (!(await checkAdminAccess(request))) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const dbAdmins = await prisma.telegramAdmin.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const dbIds = new Set(dbAdmins.map((a) => a.telegramId).filter(Boolean));

    const configPath = getBotConfigPath();
    let configIds: number[] = [];
    if (fs.existsSync(configPath)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        configIds = (cfg.admin_ids || []) as number[];
      } catch {
        /* ignore */
      }
    }

    const telegramIds = [
      ...dbAdmins.map((a) => a.telegramId).filter(Boolean),
      ...configIds.map(String),
    ];
    const usersWithPhoto = telegramIds.length
      ? await prisma.user.findMany({
          where: { telegramId: { in: telegramIds } },
          select: { telegramId: true, telegramPhoto: true },
        })
      : [];
    const photoByTelegramId = Object.fromEntries(
      usersWithPhoto
        .filter((u) => u.telegramId && u.telegramPhoto)
        .map((u) => [u.telegramId!, u.telegramPhoto!])
    );

    const result = dbAdmins.map((a) => ({
      ...a,
      telegramPhoto: (a.telegramId && photoByTelegramId[a.telegramId]) || null,
    }));

    for (const id of configIds) {
      const idStr = String(id);
      if (!dbIds.has(idStr)) {
        result.push({
          id: `config-${id}`,
          telegramId: idStr,
          username: null,
          firstName: null,
          lastName: null,
          isActive: true,
          addedBy: null,
          notes: null,
          createdAt: new Date(0).toISOString(),
          updatedAt: new Date(0).toISOString(),
          telegramPhoto: photoByTelegramId[idStr] || null,
        } as (typeof result)[0]);
      }
    }

    // Inclure l'utilisateur courant s'il est admin (rôle ADMIN) mais pas dans la liste
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { telegramId: true, telegramUsername: true, telegramFirstName: true, telegramPhoto: true, role: true },
      });
      if (currentUser?.role === 'ADMIN') {
        const tid = currentUser.telegramId ? String(currentUser.telegramId) : null;
        const alreadyInList = tid && (dbIds.has(tid) || configIds.some((c) => String(c) === tid));
        if (!alreadyInList) {
          result.unshift({
            id: 'current-user',
            telegramId: tid,
            username: currentUser.telegramUsername,
            firstName: currentUser.telegramFirstName,
            lastName: null,
            isActive: true,
            addedBy: '(vous)',
            notes: 'Admin via rôle en base',
            createdAt: new Date(0).toISOString(),
            updatedAt: new Date(0).toISOString(),
            telegramPhoto: currentUser.telegramPhoto,
          } as (typeof result)[0]);
        }
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching telegram admins:', error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement des administrateurs' },
      { status: 500 }
    );
  }
}

// POST - Ajouter un administrateur Telegram
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

    const validation = validateAndSanitize(telegramAdminCreateSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: formatZodErrors(validation.errors) },
        { status: 400 }
      );
    }
    const data = validation.data;

    const session = await getServerSession(authOptions);
    const addedBy = session?.user?.email || session?.user?.name || 'Admin';

    if (data.telegramId) {
      const existing = await prisma.telegramAdmin.findUnique({
        where: { telegramId: data.telegramId },
      });
      if (existing) {
        return NextResponse.json(
          { error: 'Cet administrateur existe déjà' },
          { status: 409 }
        );
      }
    }

    const admin = await prisma.telegramAdmin.create({
      data: {
        telegramId: data.telegramId || null,
        username: data.username || null,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        isActive: data.isActive,
        addedBy,
        notes: data.notes || null,
      },
    });

    if (admin.telegramId && admin.isActive) {
      addAdminIdToConfig(admin.telegramId);
    }
    if (admin.telegramId) invalidateAdminCacheForTelegramId(admin.telegramId);

    return NextResponse.json(admin);
  } catch (error) {
    console.error('Error creating telegram admin:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'administrateur' },
      { status: 500 }
    );
  }
}
