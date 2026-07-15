import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GetProductsFilterDto } from '../dto/get-products-filter.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class GetProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private applyFeatureFilters(
    whereClause: Prisma.ProductWhereInput,
    filters: GetProductsFilterDto,
  ) {
    const { pageCount, paperType, posterSize } = filters;
    if (!pageCount && !paperType && !posterSize) return;

    const variantFilters: Prisma.ProductVariantWhereInput = { AND: [] };

    if (pageCount) {
      (variantFilters.AND as Prisma.ProductVariantWhereInput[]).push({
        attributes: { path: ['pageCount'], equals: pageCount },
      });
    }
    if (paperType) {
      (variantFilters.AND as Prisma.ProductVariantWhereInput[]).push({
        attributes: { path: ['paperType'], equals: paperType },
      });
    }
    if (posterSize) {
      (variantFilters.AND as Prisma.ProductVariantWhereInput[]).push({
        attributes: { path: ['size'], equals: posterSize },
      });
    }

    if ((variantFilters.AND as Prisma.ProductVariantWhereInput[]).length > 0) {
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
}
