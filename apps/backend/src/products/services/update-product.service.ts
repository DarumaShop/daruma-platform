import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductUtilsService } from './product-utils.service';
import { DeleteImageService } from '../../uploads/services/delete-image.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UpdateProductService {
  private readonly logger = new Logger(UpdateProductService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly productUtils: ProductUtilsService,
    private readonly deleteImageService: DeleteImageService,
  ) {}

  async updateBaseProduct(
    slug: string,
    dto: import('../dto/update-product.dto').UpdateProductDto,
  ) {
    const product = await this.prisma.product.findUnique({ where: { slug } });
    if (!product) {
      throw new NotFoundException(`Producto con slug ${slug} no encontrado`);
    }
    const id = product.id;

    const productDetails = this.productUtils.extractProductDetails(
      dto.type || product.type,
      dto,
    );

    const {
      imageUrls,
      tagIds,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      notebookDetails,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      notepadDetails,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      posterDetails,
      ...baseData
    } = dto;

    let resolvedTagIds: string[] | undefined;
    if (tagIds !== undefined) {
      resolvedTagIds = await this.productUtils.resolveTagAncestors(tagIds);
    }

    let oldImages: { url: string }[] = [];
    if (imageUrls !== undefined) {
      oldImages = await this.prisma.productImage.findMany({
        where: { productId: id },
        select: { url: true },
      });
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const updateData: Prisma.ProductUpdateInput = {
          ...baseData,
        };

        if (resolvedTagIds !== undefined) {
          updateData.tags = {
            set: resolvedTagIds.map((id) => ({ id })),
          };
        }

        if (imageUrls !== undefined) {
          await tx.productImage.deleteMany({ where: { productId: id } });
          updateData.images = {
            create: imageUrls.map((url: string) => ({ url })),
          };
          if (imageUrls.length > 0) {
            await tx.pendingUpload.deleteMany({
              where: { url: { in: imageUrls } },
            });
          }
        }

        if (productDetails !== undefined) {
          updateData.attributes =
            productDetails === null ? Prisma.JsonNull : productDetails;
        }

        return tx.product.update({
          where: { id },
          data: updateData,
          omit: { id: true },
          include: {
            tags: { omit: { id: true, parentId: true } },
            images: { omit: { id: true, productId: true } },
            variants: { omit: { id: true, productId: true } },
          },
        });
      });

      if (imageUrls !== undefined) {
        const newUrls = new Set(imageUrls);
        const imagesToDelete = oldImages.filter((img) => !newUrls.has(img.url));
        Promise.allSettled(
          imagesToDelete.map((img) =>
            this.deleteImageService.deleteImageFromSupabase(img.url),
          ),
        ).catch((e) => this.logger.error('Error limpiando imágenes', e));
      }

      return result;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'El slug ingresado ya está en uso por otro producto',
        );
      }
      throw error;
    }
  }
}
