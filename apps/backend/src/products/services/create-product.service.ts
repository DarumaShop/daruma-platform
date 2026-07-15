import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { ProductUtilsService } from './product-utils.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CreateProductService {
  private readonly logger = new Logger(CreateProductService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly productUtils: ProductUtilsService,
  ) {}

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

  async create(dto: CreateProductDto) {
    this.validateProductDetails(dto);

    const slug = await this.productUtils.generateSlug(dto.name);
    const resolvedTagIds = await this.productUtils.resolveTagAncestors(
      dto.tagIds || [],
    );

    const productDetails = this.productUtils.extractProductDetails(
      dto.type,
      dto,
    );

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
            isActive: false,
            basePrice: 0,
            maxPrice: 0,
            images: { create: imagesData },
            tags: { connect: tagsData },
            attributes: productDetails
              ? (productDetails as Prisma.InputJsonValue)
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
        await this.productUtils.revertImages(dto.imageUrls);
      }
      throw error;
    }
  }
}
