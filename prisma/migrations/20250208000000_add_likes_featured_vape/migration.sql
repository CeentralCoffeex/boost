-- AlterTable: products - add featuredInRecent, featuredInTrending, likesCount
ALTER TABLE "products" ADD COLUMN "featuredInRecent" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "products" ADD COLUMN "featuredInTrending" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "products" ADD COLUMN "likesCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: product_variants - add unit, power, capacity, resistance
ALTER TABLE "product_variants" ADD COLUMN "unit" TEXT;
ALTER TABLE "product_variants" ADD COLUMN "power" TEXT;
ALTER TABLE "product_variants" ADD COLUMN "capacity" TEXT;
ALTER TABLE "product_variants" ADD COLUMN "resistance" TEXT;

-- AlterTable: site_settings - add featuredRecentIds, featuredTrendingIds
ALTER TABLE "site_settings" ADD COLUMN "featuredRecentIds" TEXT;
ALTER TABLE "site_settings" ADD COLUMN "featuredTrendingIds" TEXT;
