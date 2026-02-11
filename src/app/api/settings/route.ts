import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAdminAccess } from '@/lib/check-admin-access';
import { requireTelegramOrAdminOr403 } from '@/lib/require-telegram-app';
import { settingsUpdateSchema, validateAndSanitize, formatZodErrors } from '@/lib/validation';

export async function GET(request: NextRequest) {
  const forbidden = await requireTelegramOrAdminOr403(request, checkAdminAccess);
  if (forbidden) return forbidden;
  try {
    // Vérifier que le modèle SiteSettings existe
    if (!prisma.siteSettings) {
      console.error('❌ Le modèle SiteSettings n\'existe pas dans le client Prisma');
      console.error('⚠️  SOLUTION: Redémarrez le serveur Next.js (Ctrl+C puis npm run dev)');
      return NextResponse.json(
        { 
          error: 'Le modèle SiteSettings n\'est pas disponible. Redémarrez le serveur.',
          needsRestart: true 
        },
        { status: 503 }
      );
    }

    let settings = await prisma.siteSettings.findFirst();
    
    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: {
          heroTitle: 'PROPULSEZ VOTRE BUISNESS!',
          heroImage: '/hero.png',
          heroSeparatorColor: '#bef264',
          facebookUrl: 'https://facebook.com',
          twitterUrl: 'https://twitter.com',
          instagramUrl: 'https://instagram.com',
          theme: 'blanc',
        },
      });
    }

    const telegramOnly = process.env.TELEGRAM_ONLY === 'true';
    return NextResponse.json({
      ...settings,
      telegramOnly,
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement des paramètres' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Vérifier que le modèle SiteSettings existe
    if (!prisma.siteSettings) {
      console.error('❌ Le modèle SiteSettings n\'existe pas dans le client Prisma');
      console.error('⚠️  SOLUTION: Redémarrez le serveur Next.js (Ctrl+C puis npm run dev)');
      return NextResponse.json(
        { 
          error: 'Le modèle SiteSettings n\'est pas disponible. Redémarrez le serveur.',
          needsRestart: true 
        },
        { status: 503 }
      );
    }

    if (!(await checkAdminAccess(request))) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 });
    }

    const validation = validateAndSanitize(settingsUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: formatZodErrors(validation.errors) },
        { status: 400 }
      );
    }
    const bodyData = validation.data;

    let settings = await prisma.siteSettings.findFirst();

    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: {
          heroTitle: bodyData.heroTitle || 'PROPULSEZ VOTRE BUISNESS!',
          heroSubtitle1: bodyData.heroSubtitle1 || 'Exclusive',
          heroSubtitle2: bodyData.heroSubtitle2 || 'Boutique',
          heroSubtitle3: bodyData.heroSubtitle3 || 'Hotel',
          heroTagline: bodyData.heroTagline || 'Luxury Experience',
          heroImage: bodyData.heroImage || '/hero.png',
          heroSeparatorColor: bodyData.heroSeparatorColor || '#bef264',
          facebookUrl: bodyData.facebookUrl || '/',
          twitterUrl: bodyData.twitterUrl || '/',
          instagramUrl: bodyData.instagramUrl || '/',
          theme: bodyData.theme ?? 'blanc',
        },
      });
    } else {
      const updateData: Record<string, unknown> = {};
      if (bodyData.heroTitle !== undefined) updateData.heroTitle = bodyData.heroTitle;
      if (bodyData.heroSubtitle1 !== undefined) updateData.heroSubtitle1 = bodyData.heroSubtitle1;
      if (bodyData.heroSubtitle2 !== undefined) updateData.heroSubtitle2 = bodyData.heroSubtitle2;
      if (bodyData.heroSubtitle3 !== undefined) updateData.heroSubtitle3 = bodyData.heroSubtitle3;
      if (bodyData.heroTagline !== undefined) updateData.heroTagline = bodyData.heroTagline;
      if (bodyData.heroImage !== undefined) updateData.heroImage = bodyData.heroImage;
      if (bodyData.heroSeparatorColor !== undefined) updateData.heroSeparatorColor = bodyData.heroSeparatorColor || '#bef264';
      if (bodyData.facebookUrl !== undefined) updateData.facebookUrl = bodyData.facebookUrl || '/';
      if (bodyData.twitterUrl !== undefined) updateData.twitterUrl = bodyData.twitterUrl || '/';
      if (bodyData.instagramUrl !== undefined) updateData.instagramUrl = bodyData.instagramUrl || '/';
      if (bodyData.theme !== undefined) updateData.theme = bodyData.theme;
      if (bodyData.profileBlock1Title !== undefined) updateData.profileBlock1Title = bodyData.profileBlock1Title;
      if (bodyData.profileBlock1Content !== undefined) updateData.profileBlock1Content = bodyData.profileBlock1Content;
      if (bodyData.profileBlock2Title !== undefined) updateData.profileBlock2Title = bodyData.profileBlock2Title;
      if (bodyData.profileBlock2Content !== undefined) updateData.profileBlock2Content = bodyData.profileBlock2Content;
      if (bodyData.featuredRecentIds !== undefined) updateData.featuredRecentIds = bodyData.featuredRecentIds;
      if (bodyData.featuredTrendingIds !== undefined) updateData.featuredTrendingIds = bodyData.featuredTrendingIds;

      settings = await prisma.siteSettings.update({
        where: { id: settings.id },
        data: updateData,
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour des paramètres' },
      { status: 500 }
    );
  }
}
