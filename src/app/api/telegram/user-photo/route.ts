import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/check-admin-access';

/**
 * Récupère la photo de profil Telegram d'un utilisateur via l'API Bot.
 * Proxy pour ne pas exposer le token. L'utilisateur doit avoir interagi avec le bot.
 */
export async function GET(request: NextRequest) {
  try {
    if (!(await checkAdminAccess(request))) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const telegramId = searchParams.get('telegramId');
    if (!telegramId || !/^\d+$/.test(telegramId)) {
      return NextResponse.json({ error: 'telegramId requis' }, { status: 400 });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'Configuration manquante' }, { status: 500 });
    }

    const photosRes = await fetch(
      `https://api.telegram.org/bot${token}/getUserProfilePhotos?user_id=${telegramId}&limit=1`
    );
    const photosData = await photosRes.json();

    if (!photosData.ok || !photosData.result?.photos?.length) {
      return new NextResponse(null, { status: 404 });
    }

    const sizes = photosData.result.photos[0];
    const largest = sizes.reduce((a: any, b: any) =>
      (a.width * a.height > b.width * b.height ? a : b)
    );
    const fileId = largest.file_id;

    const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
    const fileData = await fileRes.json();
    if (!fileData.ok || !fileData.result?.file_path) {
      return new NextResponse(null, { status: 404 });
    }

    const imageRes = await fetch(
      `https://api.telegram.org/file/bot${token}/${fileData.result.file_path}`
    );
    if (!imageRes.ok) {
      return new NextResponse(null, { status: 404 });
    }

    const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
    const buffer = await imageRes.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[user-photo] Error:', error);
    return new NextResponse(null, { status: 404 });
  }
}
