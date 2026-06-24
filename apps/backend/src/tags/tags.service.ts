import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTagDto: CreateTagDto) {
    return this.prisma.tag.create({
      data: {
        name: createTagDto.name,
        slug: createTagDto.slug,
        parentId: createTagDto.parentId,
      },
    });
  }

  async findAll() {
    return this.prisma.tag.findMany({
      include: {
        children: true,
      },
      where: {
        parentId: null,
      },
    });
  }

  async findOne(id: string) {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
      include: { children: true },
    });
    if (!tag)
      throw new NotFoundException(`Etiqueta con ID ${id} no encontrada`);
    return tag;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.tag.delete({ where: { id } });
  }
}
