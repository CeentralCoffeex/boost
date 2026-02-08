import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Restauration des catégories et produits...');

  try {
    // Nettoyer les références à "futureworld"
    console.log('🧹 Nettoyage des références à futureworld...');
    
    // Récupérer et nettoyer les produits
    const products = await prisma.product.findMany();
    for (const product of products) {
      const cleanTitle = product.title.replace(/futureworld/gi, '').replace(/FutureWorld/g, '');
      const cleanDesc = product.description.replace(/futureworld/gi, '').replace(/FutureWorld/g, '');
      
      if (cleanTitle !== product.title || cleanDesc !== product.description) {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            title: cleanTitle,
            description: cleanDesc,
          }
        });
        console.log(`✓ Nettoyé: ${product.title} → ${cleanTitle}`);
      }
    }

    // Récupérer et nettoyer les catégories
    const categories = await prisma.category.findMany();
    for (const category of categories) {
      const cleanName = category.name.replace(/futureworld/gi, '').replace(/FutureWorld/g, '');
      const cleanSubtitle = category.subtitle.replace(/futureworld/gi, '').replace(/FutureWorld/g, '');
      
      if (cleanName !== category.name || cleanSubtitle !== category.subtitle) {
        await prisma.category.update({
          where: { id: category.id },
          data: {
            name: cleanName,
            subtitle: cleanSubtitle,
          }
        });
        console.log(`✓ Nettoyé: ${category.name} → ${cleanName}`);
      }
    }

    // Nettoyer les settings
    const settings = await prisma.siteSettings.findFirst();
    if (settings) {
      const cleanSettings: any = {};
      let hasChanges = false;

      if (settings.heroTitle?.includes('futureworld') || settings.heroTitle?.includes('FutureWorld')) {
        cleanSettings.heroTitle = settings.heroTitle.replace(/futureworld/gi, '').replace(/FutureWorld/g, '');
        hasChanges = true;
      }
      if (settings.heroSubtitle1?.includes('futureworld') || settings.heroSubtitle1?.includes('FutureWorld')) {
        cleanSettings.heroSubtitle1 = settings.heroSubtitle1.replace(/futureworld/gi, '').replace(/FutureWorld/g, '');
        hasChanges = true;
      }
      if (settings.heroSubtitle2?.includes('futureworld') || settings.heroSubtitle2?.includes('FutureWorld')) {
        cleanSettings.heroSubtitle2 = settings.heroSubtitle2.replace(/futureworld/gi, '').replace(/FutureWorld/g, '');
        hasChanges = true;
      }
      if (settings.heroSubtitle3?.includes('futureworld') || settings.heroSubtitle3?.includes('FutureWorld')) {
        cleanSettings.heroSubtitle3 = settings.heroSubtitle3.replace(/futureworld/gi, '').replace(/FutureWorld/g, '');
        hasChanges = true;
      }
      if (settings.heroTagline?.includes('futureworld') || settings.heroTagline?.includes('FutureWorld')) {
        cleanSettings.heroTagline = settings.heroTagline.replace(/futureworld/gi, '').replace(/FutureWorld/g, '');
        hasChanges = true;
      }

      if (hasChanges) {
        await prisma.siteSettings.update({
          where: { id: settings.id },
          data: cleanSettings
        });
        console.log('✓ Settings nettoyés');
      }
    }

    // Créer les catégories
    console.log('📂 Création des catégories...');
    
    let weed = await prisma.category.findFirst({ where: { url: '/weed' } });
    if (!weed) {
      weed = await prisma.category.create({
        data: {
          name: 'WEED US🍀',
          subtitle: 'WEED US',
          url: '/weed',
          backgroundColor: '#000000',
          order: 1,
          isActive: true,
        }
      });
      console.log('✓ Catégorie créée: WEED US🍀');
    }

    let hash = await prisma.category.findFirst({ where: { url: '/hash' } });
    if (!hash) {
      hash = await prisma.category.create({
        data: {
          name: 'HASH PRENIUM✨',
          subtitle: 'HASH',
          url: '/hash',
          backgroundColor: '#000000',
          order: 2,
          isActive: true,
        }
      });
      console.log('✓ Catégorie créée: HASH PRENIUM✨');
    }

    let festifs = await prisma.category.findFirst({ where: { url: '/festifs' } });
    if (!festifs) {
      festifs = await prisma.category.create({
        data: {
          name: 'FESTIFS',
          subtitle: 'Festifs',
          url: '/festifs',
          backgroundColor: '#000000',
          order: 3,
          isActive: true,
        }
      });
      console.log('✓ Catégorie créée: FESTIFS');
    }

    let vapes = await prisma.category.findFirst({ where: { url: '/vapes' } });
    if (!vapes) {
      vapes = await prisma.category.create({
        data: {
          name: 'VAPES',
          subtitle: 'Vapes',
          url: '/vapes',
          backgroundColor: '#000000',
          order: 4,
          isActive: true,
        }
      });
      console.log('✓ Catégorie créée: VAPES');
    }

    // Créer les produits
    console.log('📦 Création des produits...');

    // 1. CALI ZEPHYR VAPES
    let zephyr = await prisma.product.findFirst({ where: { title: { contains: 'CALI ZEPHYR' } } });
    if (!zephyr) {
      zephyr = await prisma.product.create({
        data: {
        title: 'CALI ZEPHYR VAPES🇺🇸',
        description: 'Vapes premium',
        tag: 'Vapes',
        basePrice: '50',
        section: 'DECOUVRIR',
        categoryId: vapes.id,
        defaultUnit: 'gramme',
        }
      });
      console.log('✓ Produit créé: CALI ZEPHYR VAPES');
    }

    const existingZephyrVariant = await prisma.productVariant.findFirst({
      where: { productId: zephyr.id, name: '1' }
    });
    if (!existingZephyrVariant) {
      await prisma.productVariant.create({
        data: {
          productId: zephyr.id,
          name: '1',
          type: 'weight',
          price: '50',
        }
      });
    }

    // 2. Grape Gas
    let grapeGas = await prisma.product.findFirst({ where: { title: { contains: 'Grape Gas' } } });
    if (!grapeGas) {
      grapeGas = await prisma.product.create({
        data: {
        title: '🍒🌸 Grape Gas',
        description: 'DECOUVRIR',
        tag: 'DECOUVRIR',
        basePrice: '50',
        section: 'DECOUVRIR',
        defaultUnit: 'gramme',
        }
      });
      console.log('✓ Produit créé: Grape Gas');
    }

    // 3. Écaille de poisson
    let ecaille = await prisma.product.findFirst({ where: { title: { contains: 'Écaille' } } });
    if (!ecaille) {
      ecaille = await prisma.product.create({
        data: {
        title: 'Écaille de poisson ❄️🐠',
        description: 'Festifs',
        tag: 'Festifs',
        basePrice: '40',
        section: 'DECOUVRIR',
        categoryId: festifs.id,
        defaultUnit: 'gramme',
      }
    });

    const existingEcailleVariant = await prisma.productVariant.findFirst({
      where: { productId: ecaille.id, name: '0.5' }
    });
    if (!existingEcailleVariant) {
      await prisma.productVariant.create({
        data: {
          productId: ecaille.id,
          name: '0.5',
          type: 'weight',
          price: '40',
        }
      });
    }

    // 4. Biscotti
    let biscotti = await prisma.product.findFirst({ where: { title: { contains: 'Biscotti' } } });
    if (!biscotti) {
      biscotti = await prisma.product.create({
        data: {
        title: '🍪 Biscotti',
        description: 'French Craft Growers',
        tag: 'French Craft',
        basePrice: '450',
        section: 'DECOUVRIR',
        defaultUnit: 'gramme',
      }
    });

    const existingBiscottiVariant = await prisma.productVariant.findFirst({
      where: { productId: biscotti.id, name: '100' }
    });
    if (!existingBiscottiVariant) {
      await prisma.productVariant.create({
        data: {
          productId: biscotti.id,
          name: '100',
          type: 'weight',
          price: '450',
        }
      });
    }

    // 5. Obama Runtz
    let obama = await prisma.product.findFirst({ where: { title: { contains: 'Obama Runtz' } } });
    if (!obama) {
      obama = await prisma.product.create({
        data: {
        title: '🇺🇸 Obama Runtz',
        description: 'HASH, Dry Sift',
        tag: 'HASH',
        basePrice: '50',
        section: 'DECOUVRIR',
        categoryId: hash.id,
        defaultUnit: 'gramme',
        }
      });
      console.log('✓ Produit créé: Banana Splitz');
    }

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
      const existing = await prisma.productVariant.findFirst({
        where: { productId: obama.id, name: v.name }
      });
      if (!existing) {
        await prisma.productVariant.create({
          data: {
            productId: obama.id,
            name: v.name,
            type: 'weight',
            price: v.price,
          }
        });
      }
    }

    // 6. Banana Splitz
    const bananaExists = await prisma.product.findFirst({ where: { title: { contains: 'Banana Splitz' } } });
    if (!bananaExists) {
      await prisma.product.create({
        data: {
        title: '🍌🍦 Banana Splitz',
        description: 'HASH, Dry Sift',
        tag: 'HASH',
        basePrice: '50',
        section: 'DECOUVRIR',
        categoryId: hash.id,
        defaultUnit: 'gramme',
        }
      });
      console.log('✓ Produit créé: Banana Splitz');
    }

    // 7. Forbidden Fruit
    const forbiddenExists = await prisma.product.findFirst({ where: { title: { contains: 'Forbidden Fruit' } } });
    if (!forbiddenExists) {
      await prisma.product.create({
        data: {
        title: '🍒🔥 Forbidden Fruit',
        description: 'Dry Sift 120u',
        tag: 'Dry Sift',
        basePrice: '80',
        section: 'DECOUVRIR',
        categoryId: hash.id,
        defaultUnit: 'gramme',
        }
      });
      console.log('✓ Produit créé: Banana Splitz');
    }

    // 8. Amnesia
    const amnesiaExists = await prisma.product.findFirst({ where: { title: { contains: 'Amnesia' } } });
    if (!amnesiaExists) {
      await prisma.product.create({
        data: {
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
