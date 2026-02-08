import { NextResponse } from 'next/server';
import { getBotAdminIds, invalidateBotAdminCache } from '@/lib/bot-admins';

export const dynamic = 'force-dynamic';

/**
 * Endpoint pour forcer le rechargement des IDs admin depuis config.json.
 * Appelé après modification des admins dans le panel.
 */
export async function POST() {
  try {
    // Invalider le cache pour forcer la relecture de config.json
    invalidateBotAdminCache();
    
    // Lire les nouveaux IDs
    const ids = getBotAdminIds();
    
    console.log('[reload-admins] Admin IDs reloaded:', Array.from(ids));
    
    return NextResponse.json({ 
      success: true, 
      count: ids.size,
      message: 'Admin IDs rechargés' 
    });
  } catch (error) {
    console.error('[reload-admins] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors du rechargement' },
      { status: 500 }
    );
  }
}
