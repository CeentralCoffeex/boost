import { NextRequest, NextResponse } from 'next/server';
import { stat, readFile, open } from 'fs/promises';
import { join, resolve } from 'path';
import { verifySignedToken } from '@/lib/upload-sign';

/** Dossier des uploads : public/uploads à la racine du projet (pas dans src). Surcharge possible avec UPLOADS_DIR. */
function getUploadsDir(): string {
  const envDir = process.env.UPLOADS_DIR;
  if (envDir) return envDir;
  return join(process.cwd(), 'public', 'uploads');
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MIME_TYPES: Record<string, string> = {
  'mp4': 'video/mp4', 'webm': 'video/webm', 'ogg': 'video/ogg',
  'mov': 'video/quicktime', 'qt': 'video/quicktime', 'm4v': 'video/x-m4v',
  '3gp': 'video/3gpp', '3g2': 'video/3gpp2', 'avi': 'video/x-msvideo',
  'mpeg': 'video/mpeg', 'mpg': 'video/mpeg',
  'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
  'gif': 'image/gif', 'webp': 'image/webp', 'svg': 'image/svg+xml',
  'heic': 'image/heic', 'heif': 'image/heif',
};

/** Sanitize filename: only allow safe chars (alphanumeric, dash, underscore, dot) */
function sanitizeFilename(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, '');
  if (!base || base.includes('..')) return '';
  return base;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename: rawFilename } = await params;
    const safeFilename = sanitizeFilename(rawFilename);
    if (!safeFilename) {
      return new NextResponse('Invalid filename', { status: 400 });
    }

    const token = req.nextUrl.searchParams.get('token');
    const expires = req.nextUrl.searchParams.get('expires');
    if (!token || !expires || !verifySignedToken(rawFilename, token, expires)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const uploadsDir = resolve(getUploadsDir());
    const filePath = resolve(uploadsDir, safeFilename);

    // Prevent path traversal (public/uploads uniquement, jamais dans src)
    if (!filePath.startsWith(uploadsDir)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    let fileStats;
    try {
      fileStats = await stat(filePath);
    } catch {
      return new NextResponse('File not found', { status: 404 });
    }

    const extension = filename.toLowerCase().split('.').pop() || '';
    const mimeType = MIME_TYPES[extension] || 'application/octet-stream';
    const fileSize = fileStats.size;
    const range = req.headers.get('range');

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = Math.min(Math.max(0, parseInt(parts[0], 10) || 0), fileSize - 1);
      const end = parts[1] ? Math.min(parseInt(parts[1], 10) || fileSize - 1, fileSize - 1) : fileSize - 1;
      const chunkSize = end - start + 1;

      const file = await open(filePath, 'r');
      const buffer = Buffer.alloc(chunkSize);
      await file.read(buffer, 0, chunkSize, start);
      await file.close();

      return new NextResponse(buffer, {
        status: 206,
        headers: {
          'Content-Type': mimeType,
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunkSize),
          'Cache-Control': 'public, max-age=31536000',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const fileBuffer = await readFile(filePath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(fileSize),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Uploads serve error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function HEAD(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename: rawFilename } = await params;
    const filename = sanitizeFilename(rawFilename);
    if (!filename) return new NextResponse(null, { status: 400 });

    const uploadsDir = resolve(getUploadsDir());
    const filePath = resolve(uploadsDir, filename);
    if (!filePath.startsWith(uploadsDir)) return new NextResponse(null, { status: 403 });

    const stats = await stat(filePath);
    const extension = filename.toLowerCase().split('.').pop() || '';
    const mimeType = MIME_TYPES[extension] || 'application/octet-stream';

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(stats.size),
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
