import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

/**
 * Seed : NE PAS toucher Product, Category, SliderImage.
 * Ces données sont gérées par l'admin et ne doivent jamais être écrasées.
 * Usage: npm run db:seed (jamais exécuté automatiquement lors du build)
 */
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding de la base de données...');

  try {
    const hashedPassword = await argon2.hash('password123');
    // Nettoyer les données existantes (optionnel) - PAS Product, Category, SliderImage
    console.log('🧹 Nettoyage des données existantes...');
    await prisma.like.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.projectImage.deleteMany();
    await prisma.project.deleteMany();
    await prisma.service.deleteMany();
    await prisma.contactMessage.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    // Créer des utilisateurs
    console.log('👤 Création des utilisateurs...');
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@portfolio.com',
        name: 'John Doe',
        password: hashedPassword,
        role: 'ADMIN',
        bio: 'Développeur Full Stack passionné par les technologies modernes et l\'innovation.',
        website: 'https://johndoe.dev',
        location: 'Paris, France',
        avatar: '/images/avatar.jpg',
      },
    });

    await prisma.user.create({
      data: {
        email: 'user@example.com',
        name: 'Jane Smith',
        password: hashedPassword,
        role: 'USER',
        bio: 'Designer UI/UX et développeuse frontend.',
        website: 'https://janesmith.design',
        location: 'Lyon, France',
      },
    });

    // Créer des projets
    console.log('🚀 Création des projets...');
    
    // Projet 3: Système de Gestion
    await prisma.project.create({
      data: {
        title: 'Système de Gestion',
        description: 'Solution complète pour la gestion des ressources humaines.',
        shortDescription: 'Solution complète pour la gestion des ressources humaines.',
        slug: 'systeme-de-gestion',
        status: 'PUBLISHED',
        category: 'Développement',
        technologies: 'Laravel, Vue.js, PostgreSQL',
        featured: true,
        published: true,
        thumbnail: 'https://www.codewithrandom.com/wp-content/uploads/2023/01/blog-card-template-7.jpg',
        userId: adminUser.id,
      },
    });

    // Créer des images pour les projets
    console.log('🖼️ Création des images de projets...');
    // await prisma.projectImage.createMany({
    //   data: [
    //     {
    //       url: '/images/projects/ecommerce-1.jpg',
    //       alt: 'Page d\'accueil e-commerce',
    //       caption: 'Interface moderne et responsive',
    //       order: 1,
    //       projectId: project1.id,
    //     },
    //     {
    //       url: '/images/projects/ecommerce-2.jpg',
    //       alt: 'Panier d\'achat',
    //       caption: 'Processus de commande simplifié',
    //       order: 2,
    //       projectId: project1.id,
    //     },
    //     {
    //       url: '/images/projects/taskapp-1.jpg',
    //       alt: 'Interface principale',
    //       caption: 'Tableau de bord intuitif',
    //       order: 1,
    //       projectId: project2.id,
    //     },
    //   ],
    // });

    // Créer des services
    console.log('🛠️ Création des services...');
    await prisma.service.createMany({
      data: [
        {
          title: 'Sécurité Web',
          description: 'Protection complète de votre site web avec audits de sécurité, certificats SSL et monitoring 24/7.',
          features: 'SSL Certificat\nAudit Sécurité\nMonitoring 24/7',
          price: 199,
          slug: 'securite-web',
          category: 'security',
          image: '/images/index/box2.png',
          ctaText: 'Commander',
          ctaLink: '/contact',
        },
      ],
    });

    console.log('✅ Seeding terminé !');
  } catch (error) {
    console.error('❌ Erreur lors du seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });