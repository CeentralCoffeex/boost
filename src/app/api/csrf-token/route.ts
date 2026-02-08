/**
 * Génère un token CSRF et le définit en cookie.
 * L'admin doit appeler cette route au chargement pour obtenir le cookie.
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function GET(request: NextRequest) {
  const token = generateToken();
  const cookieStore = await cookies();
  const isProd = process.env.NODE_ENV === 'production';

  cookieStore.set('csrf-token', token, {
    httpOnly: false, // Le JS admin doit pouvoir le lire pour l'envoyer en header
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24h
  });

  return NextResponse.json({ token });
}
