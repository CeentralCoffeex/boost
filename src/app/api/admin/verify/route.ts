import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkAdminAccess } from '@/lib/check-admin-access';

export const dynamic = 'force-dynamic';

/** Accès administration : UNIQUEMENT telegramId dans config.json OU TelegramAdmin (actif). Le rôle ADMIN ne suffit PAS. */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ allowed: false });
    }

    const allowed = await checkAdminAccess(request);
    return NextResponse.json({ allowed });
  } catch {
    return NextResponse.json({ allowed: false });
  }
}
