import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UploadsService } from '../uploads/uploads.service';

type PrismaTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
  ) {}

  async create(dto: CreateProductDto) {
    this.validateProductDetails(dto);

    try {
      const product = await this.prisma.$transaction(async (tx) => {
        const imagesData = dto.imageUrls?.map((url) => ({ url })) || [];
        const tagsData = dto.tagIds?.map((id) => ({ id })) || [];

        const createdProduct = await tx.product.create({
          data: {
            name: dto.name,
            slug: dto.slug,
            description: dto.description,
            price: dto.price,
            discountPrice: dto.discountPrice,
            stock: dto.stock ?? 0,
            type: dto.type,
            isFeatured: dto.isFeatured ?? false,
            images: { create: imagesData },
            tags: { connect: tagsData },
          },
        });

        await this.createProductDetails(tx, createdProduct.id, dto);

        if (dto.imageUrls && dto.imageUrls.length > 0) {
          await tx.pendingUpload.deleteMany({
            where: { url: { in: dto.imageUrls } },
          });
        }

        return createdProduct;
      });

      return product;
    } catch (error) {
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
        'Los detalles de Notebook son obligatorios para este tipo',
      );
    }
    if (dto.type === 'NOTEPAD' && !dto.notepadDetails) {
      throw new BadRequestException(
        'Los detalles de Notepad son obligatorios para este tipo',
      );
    }
    if (dto.type === 'POSTER' && !dto.posterDetails) {
      throw new BadRequestException(
        'Los detalles de Poster son obligatorios para este tipo',
      );
    }
  }

  private async createProductDetails(
    tx: PrismaTransaction,
    productId: string,
    dto: CreateProductDto,
  ) {
    if (dto.type === 'NOTEBOOK' && dto.notebookDetails) {
      await tx.notebookDetails.create({
        data: { productId, ...dto.notebookDetails },
      });
    } else if (dto.type === 'NOTEPAD' && dto.notepadDetails) {
      await tx.notepadDetails.create({
        data: { productId, ...dto.notepadDetails },
      });
    } else if (dto.type === 'POSTER' && dto.posterDetails) {
      await tx.posterDetails.create({
        data: { productId, ...dto.posterDetails },
      });
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

  async findAllPublic() {
    return this.prisma.product.findMany({
      where: { isActive: true },
      include: {
        images: true,
        tags: true,
        notebookDetails: true,
        notepadDetails: true,
        posterDetails: true,
      },
    });
  }

  async findOne(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        images: true,
        tags: true,
        notebookDetails: true,
        notepadDetails: true,
        posterDetails: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Producto con slug ${slug} no encontrado`);
    }

    return product;
  }

  async softDelete(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
