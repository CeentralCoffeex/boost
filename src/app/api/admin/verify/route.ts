import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkAdminAccess } from '@/lib/check-admin-access';

export const dynamic = 'force-dynamic';

/** Accès admin : session OU initData (WebView Telegram). */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const hasInitData = request.headers.get('authorization')?.startsWith('tma ');

    if (!session?.user && !hasInitData) {
      return NextResponse.json({ allowed: false });
    }

    const allowed = await checkAdminAccess(request);
    return NextResponse.json({ allowed });
  } catch {
    return NextResponse.json({ allowed: false });
  }
}
