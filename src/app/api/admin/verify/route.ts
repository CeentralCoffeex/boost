import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkAdminAccess } from '@/lib/check-admin-access';

export const dynamic = 'force-dynamic';

/** Accès admin : session OU initData (WebView Telegram). */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const hasInitData = request.headers.get('authorization')?.startsWith('tma ') ||
      !!request.headers.get('x-telegram-init-data');

    console.log('[verify] session:', session?.user?.email, 'role:', (session?.user as any)?.role);
    console.log('[verify] hasInitData:', hasInitData);

    if (!session?.user && !hasInitData) {
      console.log('[verify] REJECT: no session and no initData');
      return NextResponse.json({ allowed: false });
    }

    const allowed = await checkAdminAccess(request);
    console.log('[verify] checkAdminAccess result:', allowed);
    return NextResponse.json({ allowed });
  } catch (error) {
    console.error('[verify] ERROR:', error);
    return NextResponse.json({ allowed: false });
  }
}
