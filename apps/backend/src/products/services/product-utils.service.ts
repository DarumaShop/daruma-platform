import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DeleteImageService } from '../../uploads/services/delete-image.service';
import slugify from 'slugify';
import { Prisma } from '@prisma/client';
import { CreateProductDto } from '../dto/create-product.dto';

@Injectable()
export class ProductUtilsService {
  private readonly logger = new Logger(ProductUtilsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly deleteImageService: DeleteImageService,
  ) {}

  async resolveTagAncestors(tagIds: string[]): Promise<string[]> {
    if (!tagIds || tagIds.length === 0) return [];

    const allTags = await this.prisma.tag.findMany({
      select: { id: true, parentId: true },
    });

    const tagMap = new Map<string, string | null>();
    for (const tag of allTags) {
      tagMap.set(tag.id, tag.parentId);
    }

    for (const id of tagIds) {
      if (!tagMap.has(id)) {
        throw new BadRequestException(
          `La etiqueta proporcionada (${id}) no existe en la base de datos`,
        );
      }
    }

    const resolvedIds = new Set<string>();

    for (const id of tagIds) {
      let currentId: string | null = id;
      while (currentId) {
        resolvedIds.add(currentId);
        currentId = tagMap.get(currentId) || null;
      }
    }

    return Array.from(resolvedIds);
  }

  async generateSlug(name: string): Promise<string> {
    const baseSlug = slugify(name, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const existing = await this.prisma.product.findUnique({
        where: { slug },
      });
      if (!existing) break;
      counter++;
      slug = `${baseSlug}-${counter}`;
    }
    return slug;
  }

  getInitials(name: string): string {
    const words = name
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    const initials = words.map((w) => w[0].toUpperCase()).join('');
    return initials || 'UNK';
  }

  async generateSku(
    type: import('@prisma/client').ProductType,
    name: string,
    variantDetails: any,
  ): Promise<string> {
    let prefix = 'PRD';
    if (type === 'NOTEBOOK') prefix = 'NOTE';
    else if (type === 'NOTEPAD') prefix = 'PAD';
    else if (type === 'POSTER') prefix = 'POS';

    const initials = this.getInitials(name);

    let attrStr = '';
    if (variantDetails) {
      if (type === 'NOTEBOOK' || type === 'NOTEPAD') {
        const pageCount = variantDetails.pageCount?.replace('PAGES_', '') || '';
        const paperType = variantDetails.paperType || '';
        attrStr = `-${pageCount}-${paperType}`;
      } else if (type === 'POSTER') {
        const size = variantDetails.size || '';
        attrStr = `-${size}`;
      }
    }

    const baseSku = `${prefix}-${initials}${attrStr}`
      .replace(/-+/g, '-')
      .replace(/-$/, '');

    let sku = baseSku;
    let isUnique = false;
    while (!isUnique) {
      const existing = await this.prisma.productVariant.findUnique({
        where: { sku },
      });
      if (!existing) {
        isUnique = true;
      } else {
        const randomHash = Math.random()
          .toString(36)
          .substring(2, 6)
          .toUpperCase();
        sku = `${baseSku}-${randomHash}`;
      }
    }

    return sku;
  }

  extractVariantDetails(type: string, variant: any) {
    if (type === 'NOTEBOOK') return variant.notebookVariantDetails;
    if (type === 'NOTEPAD') return variant.notepadVariantDetails;
    if (type === 'POSTER') return variant.posterVariantDetails;
    return undefined;
  }

  extractProductDetails(type: string, dto: any) {
    if (type === 'NOTEBOOK') return dto.notebookDetails;
    if (type === 'NOTEPAD') return dto.notepadDetails;
    if (type === 'POSTER') return dto.posterDetails;
    return undefined;
  }

  async revertImages(imageUrls: string[]) {
    for (const url of imageUrls) {
      await this.deleteImageService.deleteImageFromSupabase(url);
      try {
        await this.prisma.pendingUpload.deleteMany({ where: { url } });
      } catch {
        this.logger.debug(
          `No se pudo eliminar de PendingUpload la URL: ${url}`,
        );
      }
    }
  }

  async recalculateProductPrices(productId: string) {
    const variants = await this.prisma.productVariant.findMany({
      where: { productId, isActive: true },
      select: { price: true, discountPrice: true },
    });

    const prices = variants.map((v) =>
      v.discountPrice && v.discountPrice > 0 ? v.discountPrice : v.price,
    );
    const basePrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    await this.prisma.product.update({
      where: { id: productId },
      data: { basePrice, maxPrice },
    });
  }
}
