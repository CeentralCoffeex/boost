import { PrismaClient } from '@prisma/client';

/**
 * Seed désactivé : Ne crée AUCUNE donnée automatiquement.
 * Toutes les données sont gérées manuellement via l'admin.
 */
const prisma = new PrismaClient();

async function main() {
  console.log('⚠️  Seed désactivé - Aucune donnée créée');
  console.log('✅ Utilisez l\'interface admin pour créer vos données');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });