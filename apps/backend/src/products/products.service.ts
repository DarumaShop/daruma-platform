import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { GetProductsFilterDto } from './dto/get-products-filter.dto';
import { UploadsService } from '../uploads/uploads.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
  ) {}

  private async resolveTagAncestors(tagIds: string[]): Promise<string[]> {
    if (!tagIds || tagIds.length === 0) return [];

    const allTags = await this.prisma.tag.findMany({
      select: { id: true, parentId: true },
    });

    const tagMap = new Map<string, string | null>();
    for (const tag of allTags) {
      tagMap.set(tag.id, tag.parentId);
    }

    // Verificar que los IDs proporcionados existan
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

  private extractSignificantNamePart(name: string): string {
    const stopWords = new Set([
      'cuaderno',
      'cuadernos',
      'libreta',
      'libretas',
      'poster',
      'posters',
      'de',
      'el',
      'la',
      'los',
      'las',
      'un',
      'una',
      'para',
      'con',
      'del',
    ]);

    // Limpiar acentos y pasar a minúsculas
    const cleanName = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    // Extraer palabras, ignorar stopwords, y tomar la primera que quede
    const words = cleanName
      .split(/\s+/)
      .map((w) => w.replace(/[^a-z0-9]/g, ''))
      .filter((w) => w.length > 0);
    const significantWords = words.filter((w) => !stopWords.has(w));

    const targetWord =
      significantWords.length > 0 ? significantWords[0] : words[0] || 'XXX';

    return targetWord.substring(0, 3).toUpperCase().padEnd(3, 'X');
  }

  async suggestSku(type: import('@prisma/client').ProductType, name: string) {
    let prefix = 'PRD';
    if (type === 'NOTEBOOK') prefix = 'NB';
    else if (type === 'NOTEPAD') prefix = 'NP';
    else if (type === 'POSTER') prefix = 'PT';

    const finalNamePart = this.extractSignificantNamePart(name);

    let isUnique = false;
    let sku = '';

    while (!isUnique) {
      const uniquePart = Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase();
      sku = `${prefix}-${finalNamePart}-${uniquePart}`;

      const existing = await this.prisma.productVariant.findUnique({
        where: { sku },
      });
      if (!existing) {
        isUnique = true;
      }
    }

    return { sku };
  }

  private validateSkuStructure(
    type: import('@prisma/client').ProductType,
    name: string,
    sku: string,
  ) {
    let prefix = 'PRD';
    if (type === 'NOTEBOOK') prefix = 'NB';
    else if (type === 'NOTEPAD') prefix = 'NP';
    else if (type === 'POSTER') prefix = 'PT';

    const finalNamePart = this.extractSignificantNamePart(name);
    const expectedPrefix = `${prefix}-${finalNamePart}-`;

    if (!sku.startsWith(expectedPrefix)) {
      throw new BadRequestException(
        `El SKU de la variante (${sku}) es inválido. Debe comenzar con el prefijo estructurado: ${expectedPrefix}`,
      );
    }
  }

  async create(dto: CreateProductDto) {
    this.validateProductDetails(dto);

    // Validar la estructura de todos los SKUs antes de iniciar la transacción
    for (const v of dto.variants) {
      this.validateSkuStructure(dto.type, dto.name, v.sku);
    }

    // Resolver etiquetas (padres automáticos)
    const resolvedTagIds = await this.resolveTagAncestors(dto.tagIds || []);

    try {
      const product = await this.prisma.$transaction(async (tx) => {
        const imagesData = dto.imageUrls?.map((url) => ({ url })) || [];
        const tagsData = resolvedTagIds.map((id) => ({ id }));

        // Calcular precio base y max iniciales
        const activeVariants = dto.variants.filter((v) => v.isActive !== false);
        const prices = activeVariants.map((v) => v.discountPrice ?? v.price);
        const basePrice = prices.length > 0 ? Math.min(...prices) : 0;
        const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

        const createdProduct = await tx.product.create({
          data: {
            name: dto.name,
            slug: dto.slug,
            description: dto.description,
            type: dto.type,
            isFeatured: dto.isFeatured ?? false,
            basePrice,
            maxPrice,
            images: { create: imagesData },
            tags: { connect: tagsData },
            // Crear Detalles Base
            notebookDetails:
              dto.type === 'NOTEBOOK' && dto.notebookDetails
                ? { create: dto.notebookDetails }
                : undefined,
            notepadDetails:
              dto.type === 'NOTEPAD' && dto.notepadDetails
                ? { create: dto.notepadDetails }
                : undefined,
            posterDetails:
              dto.type === 'POSTER' && dto.posterDetails
                ? { create: dto.posterDetails }
                : undefined,
            // Crear Variantes
            variants: {
              create: dto.variants.map((v) => ({
                sku: v.sku,
                price: v.price,
                discountPrice: v.discountPrice,
                stock: v.stock ?? 0,
                isActive: v.isActive ?? true,
                notebookVariantDetails:
                  dto.type === 'NOTEBOOK' && v.notebookVariantDetails
                    ? { create: v.notebookVariantDetails }
                    : undefined,
                notepadVariantDetails:
                  dto.type === 'NOTEPAD' && v.notepadVariantDetails
                    ? { create: v.notepadVariantDetails }
                    : undefined,
                posterVariantDetails:
                  dto.type === 'POSTER' && v.posterVariantDetails
                    ? { create: v.posterVariantDetails }
                    : undefined,
              })),
            },
          },
          include: {
            variants: {
              include: {
                notebookVariantDetails: true,
                notepadVariantDetails: true,
                posterVariantDetails: true,
              },
            },
            notebookDetails: true,
            notepadDetails: true,
            posterDetails: true,
          },
        });

        if (dto.imageUrls && dto.imageUrls.length > 0) {
          await tx.pendingUpload.deleteMany({
            where: { url: { in: dto.imageUrls } },
          });
        }

        return createdProduct;
      });

      return product;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'El slug del producto o el SKU de alguna variante ya está en uso',
        );
      }

      this.logger.error(
        'Error creando el producto, revirtiendo imágenes...',
        error,
      );
      if (dto.imageUrls && dto.imageUrls.length > 0) {
        await this.revertImages(dto.imageUrls);
      }
      throw error;
    }
  }

  private validateProductDetails(dto: CreateProductDto) {
    this.validateBaseDetails(dto);
    this.validateVariantDetails(dto);
  }

  private validateBaseDetails(dto: CreateProductDto) {
    if (dto.type === 'NOTEBOOK' && !dto.notebookDetails) {
      throw new BadRequestException('Faltan los detalles base de Notebook');
    }
    if (dto.type === 'NOTEPAD' && !dto.notepadDetails) {
      throw new BadRequestException('Faltan los detalles base de Notepad');
    }
    if (dto.type === 'POSTER' && !dto.posterDetails) {
      throw new BadRequestException('Faltan los detalles base de Poster');
    }
  }

  private validateVariantDetails(dto: CreateProductDto) {
    for (const [index, variant] of dto.variants.entries()) {
      if (dto.type === 'NOTEBOOK' && !variant.notebookVariantDetails) {
        throw new BadRequestException(
          `La variante ${index} no tiene los detalles específicos de Notebook`,
        );
      }
      if (dto.type === 'NOTEPAD' && !variant.notepadVariantDetails) {
        throw new BadRequestException(
          `La variante ${index} no tiene los detalles específicos de Notepad`,
        );
      }
      if (dto.type === 'POSTER' && !variant.posterVariantDetails) {
        throw new BadRequestException(
          `La variante ${index} no tiene los detalles específicos de Poster`,
        );
      }
    }
  }

  private async revertImages(imageUrls: string[]) {
    for (const url of imageUrls) {
      await this.uploadsService.deleteImageFromSupabase(url);
      try {
        await this.prisma.pendingUpload.deleteMany({ where: { url } });
      } catch {
        this.logger.debug(
          `No se pudo eliminar de PendingUpload la URL: ${url}`,
        );
      }
    }
  }

  private applyFeatureFilters(
    whereClause: Prisma.ProductWhereInput,
    filters: GetProductsFilterDto,
  ) {
    const { pageCount, paperType, posterSize } = filters;
    if (!pageCount && !paperType && !posterSize) return;

    const variantFilters: Prisma.ProductVariantWhereInput = {};
    if (pageCount || paperType) {
      variantFilters.OR = [
        {
          notebookVariantDetails: { pageCount, paperType },
        },
        {
          notepadVariantDetails: { pageCount, paperType },
        },
      ];
    }
    if (posterSize) {
      variantFilters.posterVariantDetails = { size: posterSize };
    }

    whereClause.variants = { some: variantFilters };
  }

  private applySearchTokens(
    whereClause: Prisma.ProductWhereInput,
    search: string | undefined,
  ) {
    if (!search) return;
    const tokens = search.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return;

    whereClause.AND = tokens.map((token) => {
      const conditions: Prisma.ProductWhereInput[] = [
        { name: { contains: token, mode: 'insensitive' } },
        {
          tags: {
            some: { name: { contains: token, mode: 'insensitive' } },
          },
        },
        {
          variants: {
            some: { sku: { contains: token, mode: 'insensitive' } },
          },
        },
      ];

      return { OR: conditions };
    });
  }

  private buildFilterQuery(
    filters: GetProductsFilterDto,
    isAdmin: boolean,
  ): Prisma.ProductWhereInput {
    const { search, type, tagId, tagSlug, isFeatured, onSale } = filters;
    const whereClause: Prisma.ProductWhereInput = {};

    if (!isAdmin) {
      whereClause.isActive = true;
    }

    if (type) {
      whereClause.type = type;
    }

    if (tagId || tagSlug) {
      whereClause.tags = {
        some: {
          ...(tagId ? { id: tagId } : {}),
          ...(tagSlug ? { slug: tagSlug } : {}),
        },
      };
    }

    if (isFeatured !== undefined) {
      whereClause.isFeatured = isFeatured;
    }

    if (onSale) {
      // Combina con otros filtros de variantes si ya existen
      whereClause.variants = {
        ...whereClause.variants,
        some: {
          ...whereClause.variants?.some,
          discountPrice: { not: null },
        },
      };
    }

    this.applyFeatureFilters(whereClause, filters);
    this.applySearchTokens(whereClause, search);

    return whereClause;
  }

  private getOrderByClause(
    orderBy: 'NEWEST' | 'PRICE_ASC' | 'PRICE_DESC' | undefined,
  ): Prisma.ProductOrderByWithRelationInput {
    switch (orderBy) {
      case 'PRICE_ASC':
        return { basePrice: 'asc' };
      case 'PRICE_DESC':
        return { basePrice: 'desc' };
      case 'NEWEST':
      default:
        return { createdAt: 'desc' };
    }
  }

  async findAllPublic(filters: GetProductsFilterDto) {
    const { page = 1, limit = 20, orderBy } = filters;
    const skip = (page - 1) * limit;

    const whereClause = this.buildFilterQuery(filters, false);
    const orderByClause = this.getOrderByClause(orderBy);

    const [totalItems, products] = await Promise.all([
      this.prisma.product.count({ where: whereClause }),
      this.prisma.product.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: orderByClause,
        include: {
          images: true,
          tags: true,
          notebookDetails: true,
          notepadDetails: true,
          posterDetails: true,
          variants: {
            where: { isActive: true },
            include: {
              notebookVariantDetails: true,
              notepadVariantDetails: true,
              posterVariantDetails: true,
            },
          },
        },
      }),
    ]);

    return {
      data: products,
      meta: {
        totalItems,
        itemCount: products.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      },
    };
  }

  async findAllAdmin(filters: GetProductsFilterDto) {
    const { page = 1, limit = 20, orderBy } = filters;
    const skip = (page - 1) * limit;

    const whereClause = this.buildFilterQuery(filters, true);
    const orderByClause = this.getOrderByClause(orderBy);

    const [totalItems, products] = await Promise.all([
      this.prisma.product.count({ where: whereClause }),
      this.prisma.product.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: orderByClause,
        include: {
          images: true,
          tags: true,
          notebookDetails: true,
          notepadDetails: true,
          posterDetails: true,
          variants: {
            include: {
              notebookVariantDetails: true,
              notepadVariantDetails: true,
              posterVariantDetails: true,
            },
          },
        },
      }),
    ]);

    return {
      data: products,
      meta: {
        totalItems,
        itemCount: products.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      },
    };
  }

  async findOne(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, isActive: true },
      include: {
        images: true,
        tags: true,
        notebookDetails: true,
        notepadDetails: true,
        posterDetails: true,
        variants: {
          where: { isActive: true },
          include: {
            notebookVariantDetails: true,
            notepadVariantDetails: true,
            posterVariantDetails: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(
        `Producto activo con slug ${slug} no encontrado`,
      );
    }
    return product;
  }

  async findOneAdmin(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        tags: true,
        notebookDetails: true,
        notepadDetails: true,
        posterDetails: true,
        variants: {
          include: {
            notebookVariantDetails: true,
            notepadVariantDetails: true,
            posterVariantDetails: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }
    return product;
  }

  async softDelete(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    // 1. Eliminar imágenes de Supabase
    for (const image of product.images) {
      await this.uploadsService.deleteImageFromSupabase(image.url);
    }

    // 2. Eliminar el producto de la DB (Cascada elimina variantes y detalles)
    await this.prisma.product.delete({
      where: { id },
    });
  }

  async updateBaseProduct(
    id: string,
    dto: import('./dto/update-product.dto').UpdateProductDto,
  ) {
    const {
      imageUrls,
      tagIds,
      notebookDetails,
      notepadDetails,
      posterDetails,
      ...baseData
    } = dto;

    let resolvedTagIds: string[] | undefined;
    if (tagIds !== undefined) {
      resolvedTagIds = await this.resolveTagAncestors(tagIds);
    }

    // Obtener imágenes antiguas para no dejarlas huérfanas en Supabase
    let oldImages: { url: string }[] = [];
    if (imageUrls !== undefined) {
      oldImages = await this.prisma.productImage.findMany({
        where: { productId: id },
        select: { url: true },
      });
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Update basic product data
        const updateData: Prisma.ProductUpdateInput = {
          ...baseData,
        };

        // 2. Handle tags if provided
        if (resolvedTagIds !== undefined) {
          updateData.tags = {
            set: resolvedTagIds.map((id) => ({ id })),
          };
        }

        // 3. Handle images if imageUrls is provided
        if (imageUrls !== undefined) {
          // Delete all existing images
          await tx.productImage.deleteMany({ where: { productId: id } });

          // Add new ones
          updateData.images = {
            create: imageUrls.map((url) => ({ url })),
          };

          // Remove from pending uploads
          if (imageUrls.length > 0) {
            await tx.pendingUpload.deleteMany({
              where: { url: { in: imageUrls } },
            });
          }
        }

        // 4. Update product and its details
        if (notebookDetails)
          updateData.notebookDetails = { update: notebookDetails };
        if (notepadDetails)
          updateData.notepadDetails = { update: notepadDetails };
        if (posterDetails) updateData.posterDetails = { update: posterDetails };

        return tx.product.update({
          where: { id },
          data: updateData,
          include: {
            tags: true,
            images: true,
            notebookDetails: true,
            notepadDetails: true,
            posterDetails: true,
          },
        });
      });

      // Limpiar imágenes eliminadas de Supabase de forma asíncrona
      if (imageUrls !== undefined) {
        const newUrls = new Set(imageUrls);
        const imagesToDelete = oldImages.filter((img) => !newUrls.has(img.url));
        Promise.allSettled(
          imagesToDelete.map((img) =>
            this.uploadsService.deleteImageFromSupabase(img.url),
          ),
        ).catch((e) => this.logger.error('Error limpiando imágenes', e));
      }

      return result;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'El slug ingresado ya está en uso por otro producto',
        );
      }
      throw error;
    }
  }

  private async recalculateProductPrices(productId: string) {
    const variants = await this.prisma.productVariant.findMany({
      where: { productId, isActive: true },
      select: { price: true, discountPrice: true },
    });

    const prices = variants.map((v) => v.discountPrice ?? v.price);
    const basePrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    await this.prisma.product.update({
      where: { id: productId },
      data: { basePrice, maxPrice },
    });
  }

  async addVariant(
    productId: string,
    dto: import('./dto/create-product.dto').CreateProductVariantDto,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { type: true, name: true },
    });

    if (!product) {
      throw new NotFoundException(`Producto con ID ${productId} no encontrado`);
    }

    this.validateSkuStructure(product.type, product.name, dto.sku);

    const data: Prisma.ProductVariantUncheckedCreateInput = {
      productId,
      sku: dto.sku,
      price: dto.price,
      discountPrice: dto.discountPrice,
      stock: dto.stock ?? 0,
      isActive: dto.isActive ?? true,
    };

    if (dto.notebookVariantDetails) {
      data.notebookVariantDetails = { create: dto.notebookVariantDetails };
    } else if (dto.notepadVariantDetails) {
      data.notepadVariantDetails = { create: dto.notepadVariantDetails };
    } else if (dto.posterVariantDetails) {
      data.posterVariantDetails = { create: dto.posterVariantDetails };
    }

    try {
      const variant = await this.prisma.productVariant.create({
        data,
        include: {
          notebookVariantDetails: true,
          notepadVariantDetails: true,
          posterVariantDetails: true,
        },
      });
      await this.recalculateProductPrices(productId);
      return variant;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('El SKU ingresado ya está en uso');
      }
      throw error;
    }
  }

  async updateVariant(
    variantId: string,
    dto: import('./dto/update-variant.dto').UpdateVariantDto,
  ) {
    const {
      notebookVariantDetails,
      notepadVariantDetails,
      posterVariantDetails,
      ...baseData
    } = dto;

    const updateData: Prisma.ProductVariantUpdateInput = {
      ...baseData,
    };

    if (notebookVariantDetails) {
      updateData.notebookVariantDetails = { update: notebookVariantDetails };
    } else if (notepadVariantDetails) {
      updateData.notepadVariantDetails = { update: notepadVariantDetails };
    } else if (posterVariantDetails) {
      updateData.posterVariantDetails = { update: posterVariantDetails };
    }

    try {
      const variant = await this.prisma.productVariant.update({
        where: { id: variantId },
        data: updateData,
        include: {
          notebookVariantDetails: true,
          notepadVariantDetails: true,
          posterVariantDetails: true,
        },
      });
      await this.recalculateProductPrices(variant.productId);
      return variant;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('El SKU ingresado ya está en uso');
      }
      throw error;
    }
  }

  async removeVariant(variantId: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) {
      throw new NotFoundException(`Variante con ID ${variantId} no encontrada`);
    }

    await this.prisma.productVariant.delete({
      where: { id: variantId },
    });

    await this.recalculateProductPrices(variant.productId);
  }
}
