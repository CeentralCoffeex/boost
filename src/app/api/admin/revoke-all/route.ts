import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateBotAdminCache } from '@/lib/bot-admins';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * ENDPOINT D'URGENCE : Révoque TOUS les admins sauf ceux dans config.json
 * À appeler en cas de problème de sécurité
 */
export async function POST(request: NextRequest) {
  try {
    // Supprimer tous les cookies de session
    const cookieStore = await cookies();
    cookieStore.delete('next-auth.session-token');
    cookieStore.delete('__Secure-next-auth.session-token');
    cookieStore.delete('next-auth.csrf-token');
    cookieStore.delete('__Host-next-auth.csrf-token');

    // Révoquer le rôle ADMIN de TOUS les utilisateurs en base
    await prisma.user.updateMany({
      where: { role: 'ADMIN' },
      data: { role: 'USER' },
    });

    // Désactiver tous les TelegramAdmin
    await prisma.telegramAdmin.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Invalider le cache
    invalidateBotAdminCache();

    console.log('[revoke-all] Tous les admins révoqués. Seul config.json fait foi.');

    return NextResponse.json({ 
      success: true, 
      message: 'Tous les droits admin révoqués. Seuls les admin_ids de config.json ont accès.' 
    });
  } catch (error) {
    console.error('[revoke-all] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la révocation' },
      { status: 500 }
    );
  }
}
