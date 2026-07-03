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
import slugify from 'slugify';

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

  private getInitials(name: string): string {
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

    // Clean up double dashes in case attributes are missing
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

  private extractVariantDetails(type: string, variant: any) {
    if (type === 'NOTEBOOK') return variant.notebookVariantDetails;
    if (type === 'NOTEPAD') return variant.notepadVariantDetails;
    if (type === 'POSTER') return variant.posterVariantDetails;
    return undefined;
  }

  private extractProductDetails(type: string, dto: CreateProductDto) {
    if (type === 'NOTEBOOK') return dto.notebookDetails;
    if (type === 'NOTEPAD') return dto.notepadDetails;
    if (type === 'POSTER') return dto.posterDetails;
    return undefined;
  }

  async create(dto: CreateProductDto) {
    this.validateProductDetails(dto);

    const slug = await this.generateSlug(dto.name);
    const resolvedTagIds = await this.resolveTagAncestors(dto.tagIds || []);

    const productDetails = this.extractProductDetails(dto.type, dto);

    try {
      const product = await this.prisma.$transaction(async (tx) => {
        const imagesData = dto.imageUrls?.map((url) => ({ url })) || [];
        const tagsData = resolvedTagIds.map((id) => ({ id }));

        const createdProduct = await tx.product.create({
          data: {
            name: dto.name,
            slug: slug,
            description: dto.description,
            type: dto.type,
            isFeatured: dto.isFeatured ?? false,
            isActive: false, // Inactivo por defecto hasta que tenga variantes y se publique
            basePrice: 0,
            maxPrice: 0,
            images: { create: imagesData },
            tags: { connect: tagsData },
            attributes: productDetails
              ? (productDetails as any)
              : Prisma.JsonNull,
          },
          omit: { id: true },
          include: {
            variants: { omit: { id: true, productId: true } },
            images: { omit: { id: true, productId: true } },
            tags: { omit: { id: true, parentId: true } },
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
    if (dto.type === 'NOTEBOOK' && !dto.notebookDetails) {
      throw new BadRequestException(
        'Faltan los atributos base de Notebook (notebookDetails)',
      );
    }
    if (dto.type === 'NOTEPAD' && !dto.notepadDetails) {
      throw new BadRequestException(
        'Faltan los atributos base de Notepad (notepadDetails)',
      );
    }
    if (dto.type === 'POSTER' && !dto.posterDetails) {
      throw new BadRequestException(
        'Faltan los atributos base de Poster (posterDetails)',
      );
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

    const variantFilters: Prisma.ProductVariantWhereInput = { AND: [] };

    if (pageCount) {
      (variantFilters.AND as any[]).push({
        attributes: { path: ['pageCount'], equals: pageCount },
      });
    }
    if (paperType) {
      (variantFilters.AND as any[]).push({
        attributes: { path: ['paperType'], equals: paperType },
      });
    }
    if (posterSize) {
      (variantFilters.AND as any[]).push({
        attributes: { path: ['size'], equals: posterSize },
      });
    }

    if ((variantFilters.AND as any[]).length > 0) {
      whereClause.variants = { some: variantFilters };
    }
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
        omit: { id: true },
        include: {
          images: { omit: { id: true, productId: true } },
          tags: { omit: { id: true, parentId: true } },
          variants: {
            where: { isActive: true },
            omit: { id: true, productId: true },
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
        omit: { id: true },
        include: {
          images: { omit: { id: true, productId: true } },
          tags: { omit: { id: true, parentId: true } },
          variants: { omit: { id: true, productId: true } },
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
      omit: { id: true },
      include: {
        images: { omit: { id: true, productId: true } },
        tags: { omit: { id: true, parentId: true } },
        variants: {
          where: { isActive: true },
          omit: { id: true, productId: true },
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

  async findOneAdmin(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      omit: { id: true },
      include: {
        images: { omit: { id: true, productId: true } },
        tags: { omit: { id: true, parentId: true } },
        variants: { omit: { id: true, productId: true } },
      },
    });

    if (!product) {
      throw new NotFoundException(`Producto con slug ${slug} no encontrado`);
    }
    return product;
  }

  async deactivate(slug: string) {
    const deactivatedProduct = await this.prisma.product.update({
      where: { slug },
      data: { isActive: false },
      omit: { id: true },
    });

    return {
      message: 'Producto desactivado correctamente',
      product: deactivatedProduct,
    };
  }

  async activate(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: { variants: true },
    });

    if (!product) {
      throw new NotFoundException(`Producto con slug ${slug} no encontrado`);
    }

    if (product.variants.length === 0) {
      throw new BadRequestException(
        'No se puede publicar un producto sin variantes. Añade al menos una variante primero.',
      );
    }

    const activatedProduct = await this.prisma.product.update({
      where: { slug },
      data: { isActive: true },
      omit: { id: true },
    });

    return {
      message: 'Producto activado correctamente',
      product: activatedProduct,
    };
  }

  async remove(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: { images: true },
    });

    if (!product) {
      throw new NotFoundException(`Producto con slug ${slug} no encontrado`);
    }

    for (const image of product.images) {
      await this.uploadsService.deleteImageFromSupabase(image.url);
    }

    const deletedProduct = await this.prisma.product.delete({
      where: { slug },
      omit: { id: true },
    });

    return {
      message: 'Producto eliminado permanentemente',
      product: deletedProduct,
    };
  }

  async updateBaseProduct(
    slug: string,
    dto: import('./dto/update-product.dto').UpdateProductDto,
  ) {
    const product = await this.prisma.product.findUnique({ where: { slug } });
    if (!product) {
      throw new NotFoundException(`Producto con slug ${slug} no encontrado`);
    }
    const id = product.id;

    // For UpdateProductDto we use the baseDetails from explicit dto types if provided.
    // However, UpdateProductDto in this refactor might just rely on base fields.
    // We didn't add explicit notebookDetails to UpdateProductDto but it inherits from PartialType(OmitType(CreateProductDto, ...))
    // So it does have notebookDetails, etc. Let's extract them.
    const productDetails = this.extractProductDetails(
      (dto as any).type || '',
      dto as any,
    );

    const {
      imageUrls,
      tagIds,
      notebookDetails,
      notepadDetails,
      posterDetails,
      ...baseData
    } = dto as any;

    let resolvedTagIds: string[] | undefined;
    if (tagIds !== undefined) {
      resolvedTagIds = await this.resolveTagAncestors(tagIds);
    }

    let oldImages: { url: string }[] = [];
    if (imageUrls !== undefined) {
      oldImages = await this.prisma.productImage.findMany({
        where: { productId: id },
        select: { url: true },
      });
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const updateData: Prisma.ProductUpdateInput = {
          ...baseData,
        };

        if (resolvedTagIds !== undefined) {
          updateData.tags = {
            set: resolvedTagIds.map((id) => ({ id })),
          };
        }

        if (imageUrls !== undefined) {
          await tx.productImage.deleteMany({ where: { productId: id } });
          updateData.images = {
            create: imageUrls.map((url: string) => ({ url })),
          };
          if (imageUrls.length > 0) {
            await tx.pendingUpload.deleteMany({
              where: { url: { in: imageUrls } },
            });
          }
        }

        if (productDetails !== undefined) {
          updateData.attributes =
            productDetails === null ? Prisma.JsonNull : (productDetails as any);
        }

        return tx.product.update({
          where: { id },
          data: updateData,
          omit: { id: true },
          include: {
            tags: { omit: { id: true, parentId: true } },
            images: { omit: { id: true, productId: true } },
            variants: { omit: { id: true, productId: true } },
          },
        });
      });

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

  async addVariant(
    slug: string,
    dto: import('./dto/create-product.dto').CreateProductVariantDto,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      select: { id: true, type: true, name: true },
    });

    if (!product) {
      throw new NotFoundException(`Producto con slug ${slug} no encontrado`);
    }
    const productId = product.id;

    const variantDetails = this.extractVariantDetails(product.type, dto);

    // Validate details manually for addVariant
    if (product.type === 'NOTEBOOK' && !variantDetails) {
      throw new BadRequestException(
        `La variante no tiene notebookVariantDetails`,
      );
    }
    if (product.type === 'NOTEPAD' && !variantDetails) {
      throw new BadRequestException(
        `La variante no tiene notepadVariantDetails`,
      );
    }
    if (product.type === 'POSTER' && !variantDetails) {
      throw new BadRequestException(
        `La variante no tiene posterVariantDetails`,
      );
    }

    const sku = await this.generateSku(
      product.type,
      product.name,
      variantDetails,
    );

    const data: Prisma.ProductVariantUncheckedCreateInput = {
      productId,
      sku: sku,
      price: dto.price,
      discountPrice: dto.discountPrice,
      stock: dto.stock ?? 0,
      isActive: false, // Las variantes nacen como borrador por defecto
      attributes: variantDetails ? (variantDetails as any) : Prisma.JsonNull,
    };

    try {
      const variant = await this.prisma.productVariant.create({
        data,
        omit: { id: true, productId: true },
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
    sku: string,
    dto: import('./dto/update-variant.dto').UpdateVariantDto,
  ) {
    // Determine type by looking at existing variant -> product
    const existingVariant = await this.prisma.productVariant.findUnique({
      where: { sku },
      include: { product: true },
    });

    if (!existingVariant) {
      throw new NotFoundException(`Variante con SKU ${sku} no encontrada`);
    }

    const variantDetails = this.extractVariantDetails(
      existingVariant.product.type,
      dto,
    );

    // Removing the explicit structured dtos from baseData to just save them into attributes
    const {
      notebookVariantDetails,
      notepadVariantDetails,
      posterVariantDetails,
      ...baseData
    } = dto as any;

    const updateData: Prisma.ProductVariantUpdateInput = {
      ...baseData,
    };

    if (variantDetails !== undefined) {
      updateData.attributes =
        variantDetails === null ? Prisma.JsonNull : (variantDetails as any);
    }

    try {
      const variant = await this.prisma.productVariant.update({
        where: { sku },
        data: updateData,
        omit: { id: true, productId: true },
      });
      await this.recalculateProductPrices(existingVariant.productId);
      return variant;
    } catch (error) {
      throw error;
    }
  }

  async removeVariant(sku: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { sku },
    });

    if (!variant) {
      throw new NotFoundException(`Variante con SKU ${sku} no encontrada`);
    }

    const deletedVariant = await this.prisma.productVariant.delete({
      where: { sku },
      omit: { id: true, productId: true },
    });

    await this.recalculateProductPrices(variant.productId);

    // Desactivación automática si ya no quedan variantes
    const remainingVariants = await this.prisma.productVariant.count({
      where: { productId: variant.productId },
    });

    if (remainingVariants === 0) {
      await this.prisma.product.update({
        where: { id: variant.productId },
        data: { isActive: false },
      });
      this.logger.log(
        `Producto ${variant.productId} desactivado automáticamente por quedarse sin variantes.`,
      );
    }

    return {
      message: 'Variante eliminada permanentemente',
      variant: deletedVariant,
    };
  }

  async activateVariant(sku: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { sku },
    });

    if (!variant) {
      throw new NotFoundException(`Variante con SKU ${sku} no encontrada`);
    }

    const activatedVariant = await this.prisma.productVariant.update({
      where: { sku },
      data: { isActive: true },
      omit: { id: true, productId: true },
    });

    await this.recalculateProductPrices(variant.productId);

    return {
      message: 'Variante activada correctamente',
      variant: activatedVariant,
    };
  }

  async deactivateVariant(sku: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { sku },
    });

    if (!variant) {
      throw new NotFoundException(`Variante con SKU ${sku} no encontrada`);
    }

    const deactivatedVariant = await this.prisma.productVariant.update({
      where: { sku },
      data: { isActive: false },
      omit: { id: true, productId: true },
    });

    await this.recalculateProductPrices(variant.productId);

    // Desactivación automática del padre si ya no quedan variantes activas
    const remainingActiveVariants = await this.prisma.productVariant.count({
      where: { productId: variant.productId, isActive: true },
    });

    if (remainingActiveVariants === 0) {
      await this.prisma.product.update({
        where: { id: variant.productId },
        data: { isActive: false },
      });
      this.logger.log(
        `Producto ${variant.productId} desactivado automáticamente por quedarse sin variantes activas.`,
      );
    }

    return {
      message: 'Variante desactivada correctamente',
      variant: deactivatedVariant,
    };
  }

  async updateStock(sku: string, stock: number) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { sku },
    });

    if (!variant) {
      throw new NotFoundException(`Variante con SKU ${sku} no encontrada`);
    }

    const updated = await this.prisma.productVariant.update({
      where: { sku },
      data: { stock },
      omit: { id: true, productId: true },
    });
    return updated;
  }
}
