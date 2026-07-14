import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTagDto } from '../dto/create-tag.dto';
import slugify from 'slugify';

@Injectable()
export class CreateTagService {
  constructor(private readonly prisma: PrismaService) {}

  async generateSlug(name: string): Promise<string> {
    const baseSlug = slugify(name, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const existing = await this.prisma.tag.findUnique({
        where: { slug },
      });
      if (!existing) break;
      counter++;
      slug = `${baseSlug}-${counter}`;
    }
    return slug;
  }

  async create(createTagDto: CreateTagDto) {
    let parentId: string | null = null;

    if (createTagDto.parentSlug) {
      const parent = await this.prisma.tag.findUnique({
        where: { slug: createTagDto.parentSlug },
      });
      if (!parent) {
        throw new NotFoundException(
          `Etiqueta padre con slug ${createTagDto.parentSlug} no encontrada`,
        );
      }
      parentId = parent.id;
    }

    const generatedSlug = await this.generateSlug(createTagDto.name);

    try {
      const result = await this.prisma.tag.create({
        data: {
          name: createTagDto.name,
          slug: generatedSlug,
          parentId,
        },
        omit: { id: true, parentId: true },
      });
      return result;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('El slug de la etiqueta ya está en uso');
      }
      throw error;
    }
  }
}
