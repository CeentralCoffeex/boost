import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Restauration des catégories et produits...');

  try {
    // Nettoyer les références à "futureworld"
    console.log('🧹 Nettoyage des références à futureworld...');
    
    await prisma.product.updateMany({
      where: {
        OR: [
          { title: { contains: 'futureworld' } },
          { title: { contains: 'FutureWorld' } },
          { description: { contains: 'futureworld' } },
          { description: { contains: 'FutureWorld' } },
        ]
      },
      data: {
        title: prisma.$raw`REPLACE(REPLACE(title, 'futureworld', ''), 'FutureWorld', '')`,
        description: prisma.$raw`REPLACE(REPLACE(description, 'futureworld', ''), 'FutureWorld', '')`,
      }
    });

    await prisma.category.updateMany({
      where: {
        OR: [
          { name: { contains: 'futureworld' } },
          { name: { contains: 'FutureWorld' } },
          { subtitle: { contains: 'futureworld' } },
          { subtitle: { contains: 'FutureWorld' } },
        ]
      },
      data: {
        name: prisma.$raw`REPLACE(REPLACE(name, 'futureworld', ''), 'FutureWorld', '')`,
        subtitle: prisma.$raw`REPLACE(REPLACE(subtitle, 'futureworld', ''), 'FutureWorld', '')`,
      }
    });

    // Créer les catégories
    console.log('📂 Création des catégories...');
    
    const weed = await prisma.category.upsert({
      where: { url: '/weed' },
      update: {},
      create: {
        name: 'WEED US🍀',
        subtitle: 'WEED US',
        url: '/weed',
        backgroundColor: '#000000',
        order: 1,
        isActive: true,
      }
    });

    const hash = await prisma.category.upsert({
      where: { url: '/hash' },
      update: {},
      create: {
        name: 'HASH PRENIUM✨',
        subtitle: 'HASH',
        url: '/hash',
        backgroundColor: '#000000',
        order: 2,
        isActive: true,
      }
    });

    const festifs = await prisma.category.upsert({
      where: { url: '/festifs' },
      update: {},
      create: {
        name: 'FESTIFS',
        subtitle: 'Festifs',
        url: '/festifs',
        backgroundColor: '#000000',
        order: 3,
        isActive: true,
      }
    });

    const vapes = await prisma.category.upsert({
      where: { url: '/vapes' },
      update: {},
      create: {
        name: 'VAPES',
        subtitle: 'Vapes',
        url: '/vapes',
        backgroundColor: '#000000',
        order: 4,
        isActive: true,
      }
    });

    // Créer les produits
    console.log('📦 Création des produits...');

    // 1. CALI ZEPHYR VAPES
    const zephyr = await prisma.product.upsert({
      where: { id: 'cali-zephyr-vapes' },
      update: {},
      create: {
        id: 'cali-zephyr-vapes',
        title: 'CALI ZEPHYR VAPES🇺🇸',
        description: 'Vapes premium',
        tag: 'Vapes',
        basePrice: '50',
        section: 'DECOUVRIR',
        categoryId: vapes.id,
        defaultUnit: 'gramme',
      }
    });

    await prisma.productVariant.upsert({
      where: { id: 'zephyr-1g' },
      update: {},
      create: {
        id: 'zephyr-1g',
        productId: zephyr.id,
        name: '1',
        type: 'weight',
        price: '50',
      }
    });

    // 2. Grape Gas
    const grapeGas = await prisma.product.upsert({
      where: { id: 'grape-gas' },
      update: {},
      create: {
        id: 'grape-gas',
        title: '🍒🌸 Grape Gas',
        description: 'DECOUVRIR',
        tag: 'DECOUVRIR',
        basePrice: '50',
        section: 'DECOUVRIR',
        defaultUnit: 'gramme',
      }
    });

    // 3. Écaille de poisson
    const ecaille = await prisma.product.upsert({
      where: { id: 'ecaille-poisson' },
      update: {},
      create: {
        id: 'ecaille-poisson',
        title: 'Écaille de poisson ❄️🐠',
        description: 'Festifs',
        tag: 'Festifs',
        basePrice: '40',
        section: 'DECOUVRIR',
        categoryId: festifs.id,
        defaultUnit: 'gramme',
      }
    });

    await prisma.productVariant.upsert({
      where: { id: 'ecaille-0.5g' },
      update: {},
      create: {
        id: 'ecaille-0.5g',
        productId: ecaille.id,
        name: '0.5',
        type: 'weight',
        price: '40',
      }
    });

    // 4. Biscotti
    const biscotti = await prisma.product.upsert({
      where: { id: 'biscotti' },
      update: {},
      create: {
        id: 'biscotti',
        title: '🍪 Biscotti',
        description: 'French Craft Growers',
        tag: 'French Craft',
        basePrice: '450',
        section: 'DECOUVRIR',
        defaultUnit: 'gramme',
      }
    });

    await prisma.productVariant.upsert({
      where: { id: 'biscotti-100g' },
      update: {},
      create: {
        id: 'biscotti-100g',
        productId: biscotti.id,
        name: '100',
        type: 'weight',
        price: '450',
      }
    });

    // 5. Obama Runtz
    const obama = await prisma.product.upsert({
      where: { id: 'obama-runtz' },
      update: {},
      create: {
        id: 'obama-runtz',
        title: '🇺🇸 Obama Runtz',
        description: 'HASH, Dry Sift',
        tag: 'HASH',
        basePrice: '50',
        section: 'DECOUVRIR',
        categoryId: hash.id,
        defaultUnit: 'gramme',
      }
    });

    // Variantes Obama Runtz
    const obamaVariants = [
      { name: '5', price: '50' },
      { name: '10', price: '90' },
      { name: '25', price: '200' },
      { name: '50', price: '350' },
      { name: '100', price: '600' },
      { name: '300', price: '1650' },
      { name: '500', price: '2500' },
      { name: '1000', price: '4500' },
    ];

    for (const v of obamaVariants) {
      await prisma.productVariant.upsert({
        where: { id: `obama-${v.name}g` },
        update: {},
        create: {
          id: `obama-${v.name}g`,
          productId: obama.id,
          name: v.name,
          type: 'weight',
          price: v.price,
        }
      });
    }

    // 6. Banana Splitz
    await prisma.product.upsert({
      where: { id: 'banana-splitz' },
      update: {},
      create: {
        id: 'banana-splitz',
        title: '🍌🍦 Banana Splitz',
        description: 'HASH, Dry Sift',
        tag: 'HASH',
        basePrice: '50',
        section: 'DECOUVRIR',
        categoryId: hash.id,
        defaultUnit: 'gramme',
      }
    });

    // 7. Forbidden Fruit
    await prisma.product.upsert({
      where: { id: 'forbidden-fruit' },
      update: {},
      create: {
        id: 'forbidden-fruit',
        title: '🍒🔥 Forbidden Fruit',
        description: 'Dry Sift 120u',
        tag: 'Dry Sift',
        basePrice: '80',
        section: 'DECOUVRIR',
        categoryId: hash.id,
        defaultUnit: 'gramme',
      }
    });

    // 8. Amnesia
    await prisma.product.upsert({
      where: { id: 'amnesia' },
      update: {},
      create: {
        id: 'amnesia',
        title: '🍓 Amnesia',
        description: 'DECOUVRIR',
        tag: 'DECOUVRIR',
        basePrice: '80',
        section: 'DECOUVRIR',
        defaultUnit: 'gramme',
      }
    });

    console.log('✅ Données restaurées avec succès !');
    console.log(`📂 ${4} catégories créées`);
    console.log(`📦 ${8} produits créés`);
  } catch (error) {
    console.error('❌ Erreur:', error);
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
