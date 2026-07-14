import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DeleteImageService } from '../../uploads/services/delete-image.service';

@Injectable()
export class DeleteProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deleteImageService: DeleteImageService,
  ) {}

  async remove(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: { images: true },
    });

    if (!product) {
      throw new NotFoundException(`Producto con slug ${slug} no encontrado`);
    }

    for (const image of product.images) {
      await this.deleteImageService.deleteImageFromSupabase(image.url);
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
}
