import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const MEDIA_PATH = path.join(process.cwd(), 'bots', 'broadcast_media');

const EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.mov'];

export async function GET() {
  try {
    for (const ext of EXTENSIONS) {
      const p = MEDIA_PATH + ext;
      if (fs.existsSync(p)) {
        const buffer = fs.readFileSync(p);
        const mime: Record<string, string> = {
          '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
          '.webp': 'image/webp', '.gif': 'image/gif',
          '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
        };
        return new NextResponse(buffer, {
          headers: { 'Content-Type': mime[ext] || 'application/octet-stream' },
        });
      }
    }
    return new NextResponse(null, { status: 404 });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
