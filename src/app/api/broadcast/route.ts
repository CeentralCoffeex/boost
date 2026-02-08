import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const BROADCAST_PATH = path.join(process.cwd(), 'bots', 'broadcast.json');

export async function GET() {
  try {
    if (!fs.existsSync(BROADCAST_PATH)) {
      return NextResponse.json({ text: null, media_url: null, media_type: null });
    }
    const data = JSON.parse(fs.readFileSync(BROADCAST_PATH, 'utf-8'));
    return NextResponse.json({
      text: data.text || null,
      media_url: data.media_url || null,
      media_type: data.media_type || null,
      updated_at: data.updated_at || null,
    });
  } catch {
    return NextResponse.json({ text: null, media_url: null, media_type: null });
  }
}
