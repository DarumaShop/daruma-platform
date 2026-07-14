import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ToggleProductService {
  constructor(private readonly prisma: PrismaService) {}

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
}
