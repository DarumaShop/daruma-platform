import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductUtilsService } from './product-utils.service';
import { UpdateVariantDto } from '../dto/update-variant.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class UpdateVariantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productUtils: ProductUtilsService,
  ) {}

  async updateVariant(sku: string, dto: UpdateVariantDto) {
    const existingVariant = await this.prisma.productVariant.findUnique({
      where: { sku },
      include: { product: true },
    });

    if (!existingVariant) {
      throw new NotFoundException(`Variante con SKU ${sku} no encontrada`);
    }

    const variantDetails = this.productUtils.extractVariantDetails(
      existingVariant.product.type,
      dto,
    );

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
      await this.productUtils.recalculateProductPrices(
        existingVariant.productId,
      );
      return variant;
    } catch (error) {
      throw error;
    }
  }
}
