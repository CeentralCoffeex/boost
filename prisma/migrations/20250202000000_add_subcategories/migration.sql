-- AlterTable
ALTER TABLE "categories" ADD COLUMN "parentId" TEXT;

-- CreateIndex
CREATE INDEX "categories_parentId_idx" ON "categories"("parentId");
