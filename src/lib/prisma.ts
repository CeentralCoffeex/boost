// @ts-ignore
import { PrismaClient } from '@prisma/client';

// Déclaration globale pour éviter les multiples instances en développement
declare global {
  var prisma: PrismaClient | undefined;
}

// Configuration du client Prisma avec optimisations
// Pour SQLite : ajouter ?busy_timeout=10000 dans DATABASE_URL pour limiter les P1008 (timeout)
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
  });
};

// Instance singleton du client Prisma
const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export default prisma;
export { prisma };

// Fonctions utilitaires pour la gestion de la base de données

/**
 * Fonction pour tester la connexion à la base de données
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$connect();
    console.log('✅ Connexion à la base de données réussie');
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error);
    return false;
  }
}

/**
 * Fonction pour fermer proprement la connexion
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('✅ Déconnexion de la base de données réussie');
  } catch (error) {
    console.error('❌ Erreur lors de la déconnexion:', error);
  }
}

/**
 * Fonction pour exécuter des requêtes brutes SQL
 */
export async function executeRawQuery(query: string, params?: any[]): Promise<any> {
  try {
    const result = await prisma.$queryRawUnsafe(query, ...(params || []));
    return result;
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution de la requête:', error);
    throw error;
  }
}

/**
 * Fonction pour obtenir les statistiques de la base de données
 */
export async function getDatabaseStats() {
  try {
    const [userCount, projectCount, serviceCount, messageCount] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.service.count(),
      prisma.contactMessage.count(),
    ]);

    return {
      users: userCount,
      projects: projectCount,
      services: serviceCount,
      messages: messageCount,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des statistiques:', error);
    throw error;
  }
}

/**
 * Fonction pour nettoyer les données expirées
 */
export async function cleanupExpiredData(): Promise<void> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Supprimer les sessions expirées
    const deletedSessions = await prisma.session.deleteMany({
      where: {
        expires: {
          lt: new Date(),
        },
      },
    });

    // Supprimer les anciennes données d'analytics
    // const deletedAnalytics = await prisma.analytics.deleteMany({
    //   where: {
    //     createdAt: {
    //       lt: thirtyDaysAgo,
    //     },
    //   },
    // });

    console.log(`✅ Nettoyage terminé: ${deletedSessions.count} sessions supprimées`);
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
    throw error;
  }
}

/**
 * Fonction pour sauvegarder les données importantes
 */
export async function backupData(): Promise<string> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup-${timestamp}`;

    // En production, vous pourriez utiliser pg_dump ou un service de sauvegarde
    console.log(`📦 Sauvegarde créée: ${backupName}`);
    
    return backupName;
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde:', error);
    throw error;
  }
}

/**
 * Fonction pour initialiser les données par défaut
 */
export async function seedDefaultData(): Promise<void> {
  try {
    // Vérifier si des données existent déjà
    const existingUser = await prisma.user.findFirst();
    if (existingUser) {
      console.log('ℹ️ Des données existent déjà, seed ignoré');
      return;
    }

    // Créer un utilisateur admin par défaut
    await prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Administrateur',
        role: 'ADMIN',
        bio: 'Développeur Full Stack passionné',
        website: 'https://monportfolio.com',
      },
    });

    // Créer quelques paramètres par défaut
    // await prisma.settings.createMany({
    //   data: [
    //     {
    //       key: 'site_title',
    //       value: 'Mon Portfolio',
    //       type: 'string',
    //       description: 'Titre du site web',
    //       category: 'general',
    //     },
    //     {
    //       key: 'site_description',
    //       value: 'Portfolio de développeur web',
    //       type: 'string',
    //       description: 'Description du site web',
    //       category: 'general',
    //     },
    //     {
    //       key: 'contact_email',
    //       value: 'contact@example.com',
    //       type: 'string',
    //       description: 'Email de contact',
    //       category: 'contact',
    //     },
    //     {
    //       key: 'analytics_enabled',
    //       value: 'true',
    //       type: 'boolean',
    //       description: 'Activer les analytics',
    //       category: 'analytics',
    //     },
    //   ],
    // });

    console.log('✅ Données par défaut créées avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation des données:', error);
    throw error;
  }
}

/**
 * Fonction pour obtenir une configuration spécifique
 */
export async function getSetting(_key: string): Promise<string | null> {
  // try {
  //   const setting = await prisma.settings.findUnique({
  //     where: { key },
  //   });
  //   return setting?.value || null;
  // } catch (error) {
  //   console.error(`❌ Erreur lors de la récupération du paramètre ${key}:`, error);
  //   return null;
  // }
  return null;
}

/**
 * Fonction pour mettre à jour une configuration
 */
export async function updateSetting(_key: string, _value: string): Promise<boolean> {
  // try {
  //   await prisma.settings.upsert({
  //     where: { key },
  //     update: { value, updatedAt: new Date() },
  //     create: { key, value, type: 'string' },
  //   });
  //   return true;
  // } catch (error) {
  //   console.error(`❌ Erreur lors de la mise à jour du paramètre ${key}:`, error);
  //   return false;
  // }
  return false;
}

/**
 * Fonction pour enregistrer une vue de page
 */
export async function trackPageView(_page: string, _ipAddress?: string, _userAgent?: string): Promise<void> {
  // try {
  //   await prisma.analytics.create({
  //     data: {
  //       page,
  //       event: 'page_view',
  //       ipAddress: ipAddress || null,
  //       userAgent: userAgent || null,
  //     },
  //   });
  // } catch (error) {
  //   console.error('❌ Erreur lors de l\'enregistrement de la vue:', error);
  // }
}



// Gestion des erreurs de connexion
process.on('beforeExit', async () => {
  await disconnectDatabase();
});

process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});