import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateTagDto } from '../dto/update-tag.dto';

@Injectable()
export class UpdateTagService {
  constructor(private readonly prisma: PrismaService) {}

  async update(slug: string, dto: UpdateTagDto) {
    const existingTag = await this.prisma.tag.findUnique({ where: { slug } });
    if (!existingTag) {
      throw new NotFoundException(`Etiqueta con slug ${slug} no encontrada`);
    }

    let newParentId: string | null | undefined = undefined;

    if (dto.parentSlug !== undefined) {
      if (dto.parentSlug === null) {
        newParentId = null;
      } else {
        if (dto.parentSlug === slug) {
          throw new ConflictException(
            'Una etiqueta no puede ser padre de sí misma',
          );
        }
        const parent = await this.prisma.tag.findUnique({
          where: { slug: dto.parentSlug },
        });
        if (!parent) {
          throw new NotFoundException(
            `Etiqueta padre con slug ${dto.parentSlug} no encontrada`,
          );
        }
        newParentId = parent.id;
      }
    }

    try {
      const result = await this.prisma.tag.update({
        where: { id: existingTag.id },
        data: {
          name: dto.name,
          slug: dto.slug,
          parentId: newParentId,
        },
        omit: { id: true, parentId: true },
      });

      return result;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('El slug de la etiqueta ya está en uso');
      }
      throw error;
    }
  }
}
