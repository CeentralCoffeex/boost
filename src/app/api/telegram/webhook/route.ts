/**
 * Webhook Telegram — exécuté uniquement côté serveur.
 * TELEGRAM_BOT_TOKEN : lu depuis process.env, jamais exposé au frontend.
 * Toutes les requêtes vers api.telegram.org passent par ce serveur.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isBotAdmin } from '@/lib/bot-admins';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text?: string;
    photo?: Array<{ file_id: string; file_unique_id: string; width: number; height: number }>;
  };
  callback_query?: {
    id: string;
    from: { id: number; username?: string };
    message: { chat: { id: number }; message_id: number };
    data: string;
  };
}

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Store pour les sessions d'ajout de produit (en production, utiliser Redis)
const productSessions: Map<string, {
  step: 'title' | 'description' | 'prices' | 'image' | 'confirm';
  data: { title?: string; description?: string; prices?: Array<{ name: string; price: string }>; image?: string };
}> = new Map();

// Formater un prix avec le signe euro
function formatPrice(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === '') return 'N/A';
  const s = String(val).replace(',', '.');
  if (s.endsWith('€')) return s;
  return `${s}€`;
}

async function sendTelegramMessage(chatId: number, text: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN not configured');
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });
  } catch (error) {
    console.error('Error sending Telegram message:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // OBLIGATOIRE : sans secret, le webhook est exposé à des fausses mises à jour
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!webhookSecret || webhookSecret.length < 16) {
      console.error('[Webhook] TELEGRAM_WEBHOOK_SECRET manquant ou trop court');
      return NextResponse.json({ ok: false, error: 'Server misconfigured' }, { status: 503 });
    }
    const token = request.headers.get('x-telegram-bot-api-secret-token');
    if (token !== webhookSecret) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 });
    }

    let update: TelegramUpdate;
    try {
      update = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
    }
    // Validation minimale : structure attendue par Telegram
    if (!update || typeof update !== 'object' || typeof update.update_id !== 'number') {
      return NextResponse.json({ ok: false, error: 'Invalid update format' }, { status: 400 });
    }
    
    if (!update.message?.text) {
      return NextResponse.json({ ok: true });
    }

    const { message } = update;
    const chatId = message.chat.id;
    const text = message.text;
    const telegramId = String(message.from.id);
    const telegramUsername = message.from.username || null;

    // Commande /start avec paramètre de liaison
    if (text?.startsWith('/start link_')) {
      const userId = text?.replace('/start link_', '') || '';
      
      if (!userId || userId === 'user') {
        await sendTelegramMessage(chatId, 
          '❌ <b>Erreur de liaison</b>\n\nLe lien de liaison est invalide. Veuillez réessayer depuis votre profil sur le site.'
        );
        return NextResponse.json({ ok: true });
      }

      try {
        // Vérifier si ce Telegram ID est déjà lié
        const existingLink = await prisma.user.findFirst({
          where: { telegramId },
        });

        if (existingLink) {
          await sendTelegramMessage(chatId,
            '⚠️ <b>Compte déjà lié</b>\n\nCe compte Telegram est déjà lié à un autre compte.'
          );
          return NextResponse.json({ ok: true });
        }

        // Lier le compte
        await prisma.user.update({
          where: { id: userId },
          data: {
            telegramId,
            telegramUsername,
            telegramLinkedAt: new Date(),
          },
        });

        await sendTelegramMessage(chatId,
          `✅ <b>Compte lié avec succès!</b>\n\n` +
          `Votre compte Telegram est maintenant lié à votre compte.\n\n` +
          `Vous recevrez désormais des notifications importantes ici.\n\n` +
          `Tapez /help pour voir les commandes disponibles.`
        );

      } catch (error) {
        console.error('Error linking account:', error);
        await sendTelegramMessage(chatId,
          '❌ <b>Erreur</b>\n\nUne erreur est survenue lors de la liaison. Veuillez réessayer.'
        );
      }

      return NextResponse.json({ ok: true });
    }

    // Commande /start simple
    if (text === '/start') {
      await sendTelegramMessage(chatId,
        `👋 <b>Bienvenue!</b>\n\n` +
        `Pour lier votre compte, rendez-vous sur votre profil sur le site et cliquez sur "Lier mon compte Telegram".\n\n` +
        `<b>Commandes disponibles:</b>\n` +
        `/status - Voir le statut de votre compte\n` +
        `/help - Afficher l'aide`
      );
      return NextResponse.json({ ok: true });
    }

    // Commande /status
    if (text === '/status') {
      const user = await prisma.user.findFirst({
        where: { telegramId },
        select: { name: true, email: true, telegramLinkedAt: true },
      });

      if (user) {
        await sendTelegramMessage(chatId,
          `✅ <b>Compte lié</b>\n\n` +
          `👤 Nom: ${user.name || 'Non défini'}\n` +
          `📧 Email: ${user.email}\n` +
          `📅 Lié le: ${user.telegramLinkedAt?.toLocaleDateString() || 'N/A'}`
        );
      } else {
        await sendTelegramMessage(chatId,
          `❌ <b>Compte non lié</b>\n\n` +
          `Votre compte Telegram n'est pas encore lié.\n\n` +
          `Rendez-vous sur votre profil pour le lier.`
        );
      }
      return NextResponse.json({ ok: true });
    }

    // Commande /help
    if (text === '/help') {
      // Vérifier si admin
      const isAdmin = await checkIsAdmin(telegramId, telegramUsername);
      
      let helpText = `📚 <b>Aide</b>\n\n` +
        `<b>Commandes disponibles:</b>\n\n` +
        `/start - Démarrer le bot\n` +
        `/status - Voir le statut de votre compte\n` +
        `/help - Afficher cette aide\n\n` +
        `<b>Liaison de compte:</b>\n` +
        `Pour lier votre compte Telegram, connectez-vous sur le site, ` +
        `allez dans votre profil et cliquez sur "Lier mon compte Telegram".`;
      
      if (isAdmin) {
        helpText += `\n\n<b>🔐 Commandes Admin:</b>\n` +
          `/admin - Panel d'administration\n` +
          `/addproduct - Ajouter un nouveau produit\n` +
          `/listproducts - Lister les produits\n` +
          `/stats - Statistiques du site\n` +
          `/cancel - Annuler l'opération en cours`;
      }
      
      await sendTelegramMessage(chatId, helpText);
      return NextResponse.json({ ok: true });
    }

    // ========== COMMANDES ADMIN ==========
    
    // Vérifier si admin pour les commandes suivantes
    const isAdmin = await checkIsAdmin(telegramId, telegramUsername);

    // Commande /admin
    if (text === '/admin') {
      if (!isAdmin) {
        await sendTelegramMessage(chatId, '❌ <b>Accès refusé</b>\n\nVous n\'êtes pas administrateur.');
        return NextResponse.json({ ok: true });
      }
      
      await sendTelegramMessage(chatId,
        `🔐 <b>Panel Admin</b>\n\n` +
        `Bienvenue dans le panel d'administration!\n\n` +
        `<b>Actions disponibles:</b>\n` +
        `/addproduct - ➕ Ajouter un produit\n` +
        `/listproducts - 📦 Voir les produits\n` +
        `/stats - 📊 Statistiques\n` +
        `/messages - 👥 Messages récents\n\n` +
        `Tapez une commande pour commencer.`
      );
      return NextResponse.json({ ok: true });
    }

    // Commande /addproduct - Démarrer l'ajout de produit
    if (text === '/addproduct') {
      if (!isAdmin) {
        await sendTelegramMessage(chatId, '❌ <b>Accès refusé</b>');
        return NextResponse.json({ ok: true });
      }
      
      productSessions.set(telegramId, { step: 'title', data: {} });
      
      await sendTelegramMessage(chatId,
        `➕ <b>Ajout d'un nouveau produit</b>\n\n` +
        `Étape 1/4: Entrez le <b>titre</b> du produit:\n\n` +
        `<i>Tapez /cancel pour annuler</i>`
      );
      return NextResponse.json({ ok: true });
    }

    // Commande /cancel - Annuler l'opération en cours
    if (text === '/cancel') {
      productSessions.delete(telegramId);
      await sendTelegramMessage(chatId, '❌ Opération annulée.');
      return NextResponse.json({ ok: true });
    }

    // Commande /listproducts - Lister les produits
    if (text === '/listproducts') {
      if (!isAdmin) {
        await sendTelegramMessage(chatId, '❌ <b>Accès refusé</b>');
        return NextResponse.json({ ok: true });
      }
      
      const products = await prisma.product.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { variants: { orderBy: [{ type: 'asc' }, { name: 'asc' }] } },
      });
      
      if (products.length === 0) {
        await sendTelegramMessage(chatId, '📦 <b>Aucun produit</b>\n\nAucun produit n\'a été ajouté.');
        return NextResponse.json({ ok: true });
      }
      
      let productList = '📦 <b>Derniers produits:</b>\n\n';
      products.forEach((p: any, i: number) => {
        const variants = p.variants || [];
        const pricesDisplay = variants.length > 0
          ? variants.map((v: any) => `${v.name}g ${formatPrice(v.price)}`).join(' • ')
          : (p.basePrice ? formatPrice(p.basePrice) : 'N/A');
        productList += `${i + 1}. <b>${p.title}</b>\n   💰 ${pricesDisplay}\n   🏷 ${p.tag || 'Aucun tag'}\n\n`;
      });
      
      await sendTelegramMessage(chatId, productList);
      return NextResponse.json({ ok: true });
    }

    // Commande /stats - Statistiques
    if (text === '/stats') {
      if (!isAdmin) {
        await sendTelegramMessage(chatId, '❌ <b>Accès refusé</b>');
        return NextResponse.json({ ok: true });
      }
      
      const [userCount, productCount, messageCount] = await Promise.all([
        prisma.user.count(),
        prisma.product.count(),
        prisma.contactMessage.count(),
      ]);
      
      await sendTelegramMessage(chatId,
        `📊 <b>Statistiques</b>\n\n` +
        `👥 Utilisateurs: <b>${userCount}</b>\n` +
        `📦 Produits: <b>${productCount}</b>\n` +
        `👥 Messages: <b>${messageCount}</b>`
      );
      return NextResponse.json({ ok: true });
    }

    // Gestion du flow d'ajout de produit
    const session = productSessions.get(telegramId);
    if (session && isAdmin) {
      return await handleProductSession(chatId, telegramId, text || '', session);
    }

    // Message par défaut
    await sendTelegramMessage(chatId,
      `Je n'ai pas compris votre message. Tapez /help pour voir les commandes disponibles.`
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: true });
  }
}

// Vérifier si l'utilisateur est admin (admins bot par défaut + TelegramAdmin table)
async function checkIsAdmin(telegramId: string, username: string | null): Promise<boolean> {
  // Admins du bot = admins par défaut sur le site
  if (isBotAdmin(telegramId)) return true;

  const conditions = [{ telegramId }];
  if (username) {
    conditions.push({ username } as any);
  }

  const admin = await prisma.telegramAdmin.findFirst({
    where: {
      OR: conditions,
      isActive: true,
    },
  });
  return !!admin;
}

// Parser une ligne de prix : "5g 50€", "5.5g 55€", "3,5g 30€"
function parsePriceLine(line: string): { name: string; price: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  // Format: Xg ou X,XXg ou X.XXg + Y€ (accepte décimaux pour grammage et prix)
  const match = trimmed.match(/^(\d+(?:[.,]\d+)?)\s*g\s*[:\s]*(\d+(?:[.,]\d+)?)\s*€?\s*$/i);
  if (!match || !match[1] || !match[2]) return null;
  const gram = match[1].replace(',', '.');
  const price = match[2].replace(',', '.');
  return { name: gram, price };
}

// Gérer le flow d'ajout de produit
async function handleProductSession(
  chatId: number,
  telegramId: string,
  text: string,
  session: { step: string; data: { title?: string; description?: string; prices?: Array<{ name: string; price: string }>; image?: string } }
) {
  switch (session.step) {
    case 'title':
      session.data.title = text;
      session.step = 'description' as any;
      productSessions.set(telegramId, session as any);
      await sendTelegramMessage(chatId,
        `✅ Titre: <b>${text}</b>\n\n` +
        `Étape 2/4: Entrez la <b>description</b> du produit:`
      );
      break;

    case 'description':
      session.data.description = text;
      session.step = 'prices' as any;
      productSessions.set(telegramId, session as any);
      await sendTelegramMessage(chatId,
        `✅ Description enregistrée!\n\n` +
        `Étape 3/4: Envoyez vos <b>prix par ligne</b>, par exemple:\n\n` +
        `<code>5g 50€</code>\n` +
        `<code>5.5g 55€</code>\n` +
        `<code>3,5g 30€</code>\n\n` +
        `Grammages décimaux autorisés (5.5, 2,5, etc.).\n\n` +
        `<i>Tapez /cancel pour annuler</i>`
      );
      break;

    case 'prices': {
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      const prices: Array<{ name: string; price: string }> = [];
      const invalid: string[] = [];

      for (const line of lines) {
        const parsed = parsePriceLine(line);
        if (parsed) {
          prices.push(parsed);
        } else if (line.trim()) {
          invalid.push(line.trim());
        }
      }

      if (prices.length === 0) {
        await sendTelegramMessage(chatId,
          `❌ Aucun prix valide détecté. Utilisez le format <code>Xg Y€</code> par ligne.\n\n` +
          `Exemples:\n<code>5g 50€</code>\n<code>5.5g 55€</code>\n<code>3,5g 30€</code>`
        );
        return NextResponse.json({ ok: true });
      }

      const invalidNote = invalid.length > 0
        ? `\n\n⚠️ ${invalid.length} ligne(s) ignorée(s) (format invalide).`
        : '';

      session.data.prices = prices;
      session.step = 'confirm' as any;
      productSessions.set(telegramId, session as any);

      const pricesDisplay = prices.map((p) => `${p.name}g ${formatPrice(p.price)}`).join('\n   ');
      await sendTelegramMessage(chatId,
        `📝 <b>Récapitulatif du produit:</b>\n\n` +
        `📌 Titre: <b>${session.data.title}</b>\n` +
        `📄 Description: ${session.data.description}\n` +
        `💰 Prix:\n   ${pricesDisplay}${invalidNote}\n\n` +
        `Tapez <b>OUI</b> pour confirmer ou /cancel pour annuler.`
      );
      break;
    }

    case 'confirm':
      if (text.toLowerCase() === 'oui') {
        try {
          const prices = session.data.prices || [];
          const first = prices[0];
          const basePrice = first ? first.price : null;
          await prisma.product.create({
            data: {
              title: session.data.title!,
              description: session.data.description!,
              basePrice,
              section: 'DECOUVRIR',
              variants: {
                create: prices.map((p) => ({
                  name: p.name,
                  type: 'weight',
                  price: p.price,
                })),
              },
            },
          });

          productSessions.delete(telegramId);
          await sendTelegramMessage(chatId,
            `✅ <b>Produit ajouté avec succès!</b>\n\n` +
            `Le produit "${session.data.title}" est maintenant disponible sur le site.\n\n` +
            `Prix: ${prices.map((p) => `${p.name}g ${formatPrice(p.price)}`).join(', ')}`
          );
        } catch (error) {
          console.error('Error creating product:', error);
          await sendTelegramMessage(chatId, '❌ Erreur lors de la création du produit.');
        }
      } else {
        await sendTelegramMessage(chatId, 'Tapez <b>OUI</b> pour confirmer ou /cancel pour annuler.');
      }
      break;
  }

  return NextResponse.json({ ok: true });
}

// GET pour vérifier que le webhook fonctionne
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Telegram webhook endpoint is active' 
  });
}
