import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductUtilsService } from './product-utils.service';

@Injectable()
export class ToggleVariantService {
  private readonly logger = new Logger(ToggleVariantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly productUtils: ProductUtilsService,
  ) {}

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

    await this.productUtils.recalculateProductPrices(variant.productId);

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

    await this.productUtils.recalculateProductPrices(variant.productId);

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
