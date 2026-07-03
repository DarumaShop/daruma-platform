/*
  Warnings:

  - You are about to drop the `NotebookDetails` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NotebookVariantDetails` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NotepadDetails` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NotepadVariantDetails` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PosterDetails` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PosterVariantDetails` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "NotebookDetails" DROP CONSTRAINT "NotebookDetails_productId_fkey";

-- DropForeignKey
ALTER TABLE "NotebookVariantDetails" DROP CONSTRAINT "NotebookVariantDetails_variantId_fkey";

-- DropForeignKey
ALTER TABLE "NotepadDetails" DROP CONSTRAINT "NotepadDetails_productId_fkey";

-- DropForeignKey
ALTER TABLE "NotepadVariantDetails" DROP CONSTRAINT "NotepadVariantDetails_variantId_fkey";

-- DropForeignKey
ALTER TABLE "PosterDetails" DROP CONSTRAINT "PosterDetails_productId_fkey";

-- DropForeignKey
ALTER TABLE "PosterVariantDetails" DROP CONSTRAINT "PosterVariantDetails_variantId_fkey";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "attributes" JSONB;

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "attributes" JSONB;

-- DropTable
DROP TABLE "NotebookDetails";

-- DropTable
DROP TABLE "NotebookVariantDetails";

-- DropTable
DROP TABLE "NotepadDetails";

-- DropTable
DROP TABLE "NotepadVariantDetails";

-- DropTable
DROP TABLE "PosterDetails";

-- DropTable
DROP TABLE "PosterVariantDetails";

-- DropEnum
DROP TYPE "PageCount";

-- DropEnum
DROP TYPE "PaperType";

-- DropEnum
DROP TYPE "PosterSize";
