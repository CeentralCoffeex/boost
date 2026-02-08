import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkAdminAccess, invalidateAdminCacheForUser } from '@/lib/check-admin-access';
import { telegramAdminUpdateSchema, validateAndSanitize, formatZodErrors, validateId } from '@/lib/validation';
import { addAdminIdToConfig, removeAdminIdFromConfig } from '@/lib/sync-bot-config';

// PUT - Modifier un administrateur Telegram
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await checkAdminAccess(request))) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!validateId(id, 'adminId')) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 });
    }

    const validation = validateAndSanitize(telegramAdminUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: formatZodErrors(validation.errors) },
        { status: 400 }
      );
    }
    const data = validation.data;

    const updateData: Record<string, unknown> = {};
    if (data.telegramId !== undefined) updateData.telegramId = data.telegramId;
    if (data.username !== undefined) updateData.username = data.username;
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.notes !== undefined) updateData.notes = data.notes;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Aucune donnée à mettre à jour' }, { status: 400 });
    }

    const before = await prisma.telegramAdmin.findUnique({ where: { id } });
    const admin = await prisma.telegramAdmin.update({
      where: { id },
      data: updateData,
    });
    if (before?.telegramId && !admin.isActive) removeAdminIdFromConfig(before.telegramId);
    else if (admin.telegramId && admin.isActive) addAdminIdToConfig(admin.telegramId);

    return NextResponse.json(admin);
  } catch (error) {
    console.error('Error updating telegram admin:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'administrateur' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un administrateur Telegram
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await checkAdminAccess(request))) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Se retirer soi-même en tant qu'admin (rôle ADMIN -> USER + retirer de config.json + TelegramAdmin)
    if (id === 'current-user') {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
      }
      const currentUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { telegramId: true } });
      if (currentUser?.telegramId) {
        removeAdminIdFromConfig(currentUser.telegramId);
        await prisma.telegramAdmin.deleteMany({ where: { telegramId: currentUser.telegramId } });
      }
      await prisma.user.update({
        where: { id: session.user.id },
        data: { role: 'USER' },
      });
      invalidateAdminCacheForUser(session.user.id, session.user.email ?? undefined);
      return NextResponse.json({ success: true, message: 'Droits admin retirés', redirect: true });
    }

    if (id.startsWith('config-')) {
      const telegramId = id.replace('config-', '');
      removeAdminIdFromConfig(telegramId);
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        const currentUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { telegramId: true } });
        if (currentUser?.telegramId && String(currentUser.telegramId) === telegramId) {
          await prisma.user.update({ where: { id: session.user.id }, data: { role: 'USER' } });
          return NextResponse.json({ success: true, message: 'Administrateur supprimé', redirect: true });
        }
      }
      return NextResponse.json({ success: true, message: 'Administrateur supprimé' });
    }

    if (!validateId(id, 'adminId')) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
    }

    const admin = await prisma.telegramAdmin.findUnique({ where: { id } });
    await prisma.telegramAdmin.delete({ where: { id } });
    if (admin?.telegramId) removeAdminIdFromConfig(admin.telegramId);

    const session = await getServerSession(authOptions);
    if (session?.user?.id && admin?.telegramId) {
      const currentUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { telegramId: true } });
      if (currentUser?.telegramId && String(currentUser.telegramId) === String(admin.telegramId)) {
        await prisma.user.update({ where: { id: session.user.id }, data: { role: 'USER' } });
        return NextResponse.json({ success: true, message: 'Administrateur supprimé', redirect: true });
      }
    }
    return NextResponse.json({ success: true, message: 'Administrateur supprimé' });
  } catch (error) {
    console.error('Error deleting telegram admin:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'administrateur' },
      { status: 500 }
    );
  }
}
