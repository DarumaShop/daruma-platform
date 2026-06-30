import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [totalActiveProducts, totalTags, outOfStockVariants] =
      await Promise.all([
        this.prisma.product.count({ where: { isActive: true } }),
        this.prisma.tag.count(),
        this.prisma.productVariant.findMany({
          where: {
            isActive: true,
            stock: { lte: 0 },
            product: { isActive: true },
          },
          include: {
            product: { select: { name: true, type: true } },
          },
        }),
      ]);

    return {
      totalActiveProducts,
      totalTags,
      outOfStockAlerts: outOfStockVariants.map((v) => ({
        variantId: v.id,
        productId: v.productId,
        productName: v.product.name,
        productType: v.product.type,
        sku: v.sku,
        stock: v.stock,
      })),
    };
  }
}
