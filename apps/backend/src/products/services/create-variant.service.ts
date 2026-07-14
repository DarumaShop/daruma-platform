import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductUtilsService } from './product-utils.service';
import { CreateProductVariantDto } from '../dto/create-product.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CreateVariantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productUtils: ProductUtilsService,
  ) {}

  async addVariant(slug: string, dto: CreateProductVariantDto) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      select: { id: true, type: true, name: true },
    });

    if (!product) {
      throw new NotFoundException(`Producto con slug ${slug} no encontrado`);
    }
    const productId = product.id;

    const variantDetails = this.productUtils.extractVariantDetails(
      product.type,
      dto,
    );

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

    const sku = await this.productUtils.generateSku(
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
      await this.productUtils.recalculateProductPrices(productId);
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
}
