import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkAdminAccess } from '@/lib/check-admin-access';
import ProfileClient from './ProfileClient';

export default async function ProfilPage() {
  const session = await getServerSession(authOptions);
  
  let telegramInfo = null;

  // Chercher par id (fiable pour Telegram) ou email
  const userId = session?.user?.id;
  const userEmail = session?.user?.email;
  if (userId || userEmail) {
    const user = await prisma.user.findFirst({
      where: userId ? { id: userId } : { email: userEmail! },
      select: {
        telegramId: true,
        telegramUsername: true,
        telegramFirstName: true,
        telegramPhoto: true,
        telegramLinkedAt: true,
        role: true,
      },
    });

    if (user) {
      // Administration : config.json OU TelegramAdmin (actif) OU rôle ADMIN en base
      const isAdmin = await checkAdminAccess(null);

      telegramInfo = {
        linked: !!user.telegramId,
        telegramId: user.telegramId,
        telegramUsername: user.telegramUsername,
        telegramFirstName: user.telegramFirstName,
        telegramPhoto: user.telegramPhoto,
        linkedAt: user.telegramLinkedAt ? user.telegramLinkedAt.toISOString() : null,
        isAdmin,
      };
    }
  }

  return <ProfileClient initialTelegramInfo={telegramInfo} />;
}
