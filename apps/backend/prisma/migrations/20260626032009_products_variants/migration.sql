/*
  Warnings:

  - You are about to drop the column `pageCount` on the `NotebookDetails` table. All the data in the column will be lost.
  - You are about to drop the column `paperType` on the `NotebookDetails` table. All the data in the column will be lost.
  - You are about to drop the column `pageCount` on the `NotepadDetails` table. All the data in the column will be lost.
  - You are about to drop the column `paperType` on the `NotepadDetails` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `PosterDetails` table. All the data in the column will be lost.
  - You are about to drop the column `discountPrice` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `stock` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "NotebookDetails" DROP COLUMN "pageCount",
DROP COLUMN "paperType";

-- AlterTable
ALTER TABLE "NotepadDetails" DROP COLUMN "pageCount",
DROP COLUMN "paperType";

-- AlterTable
ALTER TABLE "PosterDetails" DROP COLUMN "size";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "discountPrice",
DROP COLUMN "price",
DROP COLUMN "stock";

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "discountPrice" INTEGER,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "productId" TEXT NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotebookVariantDetails" (
    "variantId" TEXT NOT NULL,
    "pageCount" "PageCount" NOT NULL,
    "paperType" "PaperType" NOT NULL,

    CONSTRAINT "NotebookVariantDetails_pkey" PRIMARY KEY ("variantId")
);

-- CreateTable
CREATE TABLE "NotepadVariantDetails" (
    "variantId" TEXT NOT NULL,
    "pageCount" "PageCount" NOT NULL,
    "paperType" "PaperType" NOT NULL,

    CONSTRAINT "NotepadVariantDetails_pkey" PRIMARY KEY ("variantId")
);

-- CreateTable
CREATE TABLE "PosterVariantDetails" (
    "variantId" TEXT NOT NULL,
    "size" "PosterSize" NOT NULL,

    CONSTRAINT "PosterVariantDetails_pkey" PRIMARY KEY ("variantId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotebookVariantDetails" ADD CONSTRAINT "NotebookVariantDetails_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotepadVariantDetails" ADD CONSTRAINT "NotepadVariantDetails_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosterVariantDetails" ADD CONSTRAINT "PosterVariantDetails_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
