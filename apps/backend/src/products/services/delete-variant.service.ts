import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductUtilsService } from './product-utils.service';

@Injectable()
export class DeleteVariantService {
  private readonly logger = new Logger(DeleteVariantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly productUtils: ProductUtilsService,
  ) {}

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

    await this.productUtils.recalculateProductPrices(variant.productId);

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
}
