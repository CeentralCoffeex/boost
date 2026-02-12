/**
 * Sert les fichiers uploadés depuis public/uploads.
 * Accès uniquement via URL signée : ?token=...&expires=... (générées côté serveur).
 * Supporte les requêtes Range (HTTP 206) pour la lecture vidéo.
 */
import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { createReadStream } from 'fs';
import { join } from 'path';
import { Readable } from 'stream';
import { verifySignedToken } from '@/lib/upload-sign';

function getUploadsDir(): string {
  const envDir = process.env.UPLOADS_DIR;
  if (envDir) return envDir;
  return join(process.cwd(), 'public', 'uploads');
}

const MIME_TYPES: Record<string, string> = {
  webp: 'image/webp',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
};

const VIDEO_EXTS = new Set(['mp4', 'webm', 'mov', 'm4v', 'ogg']);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    if (!pathSegments?.length) {
      return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });
    }

    const filename = pathSegments.join('/');
    const baseName = filename.split(/[/\\]/).pop() || '';
    if (!baseName || baseName.includes('..')) {
      return NextResponse.json({ error: 'Chemin invalide' }, { status: 400 });
    }

    const token = request.nextUrl.searchParams.get('token');
    const expires = request.nextUrl.searchParams.get('expires');
    if (!token || !expires || !verifySignedToken(filename, token, expires)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const uploadDir = getUploadsDir();
    const filePath = join(uploadDir, filename);

    const ext = baseName.split('.').pop()?.toLowerCase() || '';
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
    const isVideo = VIDEO_EXTS.has(ext);

    const fileStat = await stat(filePath);
    const fileSize = fileStat.size;
    const rangeHeader = request.headers.get('range');

    // Support des requêtes Range (requis pour la lecture vidéo HTML5)
    if (rangeHeader && (isVideo || fileSize > 1024 * 1024)) {
      const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
      if (match) {
        const start = match[1] ? parseInt(match[1], 10) : 0;
        const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
        const chunkStart = Math.min(start, fileSize - 1);
        const chunkEnd = Math.min(end, fileSize - 1);
        const chunkSize = chunkEnd - chunkStart + 1;

        const stream = createReadStream(filePath, { start: chunkStart, end: chunkEnd });
        const webStream = Readable.toWeb(stream) as ReadableStream<Uint8Array>;

        return new NextResponse(webStream, {
          status: 206,
          headers: {
            'Content-Type': mimeType,
            'Content-Length': String(chunkSize),
            'Content-Range': `bytes ${chunkStart}-${chunkEnd}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }
    }

    // Fichiers petits ou sans Range : réponse complète
    const buffer = await readFile(filePath);
    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    };
    if (isVideo || fileSize > 1024 * 1024) {
      headers['Accept-Ranges'] = 'bytes';
      headers['Content-Length'] = String(fileSize);
    }
    return new NextResponse(buffer, { headers });
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return new NextResponse(null, { status: 404 });
    }
    console.error('[uploads] Error serving file:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
