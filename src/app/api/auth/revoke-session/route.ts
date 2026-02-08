import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * Révoque toutes les sessions et cookies pour forcer une re-authentification
 */
export async function POST() {
  try {
    const cookieStore = await cookies();
    
    // Supprimer tous les cookies NextAuth
    cookieStore.delete('next-auth.session-token');
    cookieStore.delete('__Secure-next-auth.session-token');
    cookieStore.delete('next-auth.csrf-token');
    cookieStore.delete('__Host-next-auth.csrf-token');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Session révoquée' 
    });
  } catch (error) {
    console.error('[revoke-session] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la révocation' },
      { status: 500 }
    );
  }
}
