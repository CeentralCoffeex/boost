import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { botLinkSchema, validateAndSanitize, formatZodErrors } from '@/lib/validation';

// Helper pour vérifier l'API key du bot
function checkBotAuth(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  const validApiKey = process.env.BOT_API_KEY;
  
  return apiKey && validApiKey && apiKey === validApiKey;
}

export async function POST(request: NextRequest) {
  try {
    // Vérification de l'authentification bot
    if (!checkBotAuth(request)) {
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

    const validation = validateAndSanitize(botLinkSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: formatZodErrors(validation.errors) },
        { status: 400 }
      );
    }
    const { userId, telegramId, telegramUsername, telegramFirstName, telegramPhoto } = validation.data;

    // Vérifier si ce Telegram ID est déjà lié à un autre compte
    const existingLink = await prisma.user.findFirst({
      where: { 
        telegramId,
        NOT: { id: userId }
      },
    });

    if (existingLink) {
      return NextResponse.json(
        { error: 'Ce compte Telegram est déjà lié à un autre utilisateur' },
        { status: 409 }
      );
    }

    // Lier le compte
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        telegramId,
        telegramUsername: telegramUsername || null,
        telegramFirstName: telegramFirstName || null,
        telegramPhoto: telegramPhoto || null,
        telegramLinkedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });

  } catch (error) {
    console.error('Error linking telegram from bot:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la liaison' },
      { status: 500 }
    );
  }
}
