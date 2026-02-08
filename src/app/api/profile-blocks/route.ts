import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const settings = await prisma.siteSettings.findFirst();
    if (!settings) {
      return NextResponse.json({
        block1: { title: null, content: null },
        block2: { title: null, content: null },
      });
    }
    return NextResponse.json({
      block1: {
        title: settings.profileBlock1Title ?? null,
        content: settings.profileBlock1Content ?? null,
      },
      block2: {
        title: settings.profileBlock2Title ?? null,
        content: settings.profileBlock2Content ?? null,
      },
    });
  } catch (error) {
    console.error('Error fetching profile blocks:', error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement des blocs profil' },
      { status: 500 }
    );
  }
}
