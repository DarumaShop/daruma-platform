import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
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

  async findAll(search?: string) {
    const whereClause = search
      ? { name: { contains: search, mode: 'insensitive' as const } }
      : {};

    const allTags = await this.prisma.tag.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { products: { where: { isActive: true } } },
        },
      },
    });

    // Si hay una búsqueda, devolvemos una lista plana con las coincidencias
    if (search) {
      return allTags;
    }

    type TagWithCount = (typeof allTags)[0];
    type TagTree = TagWithCount & { children: TagTree[] };

    const tagMap = new Map<string, TagTree>();
    allTags.forEach((tag) => {
      tagMap.set(tag.id, { ...tag, children: [] });
    });

    const rootTags: TagTree[] = [];
    allTags.forEach((tag) => {
      if (tag.parentId) {
        const parent = tagMap.get(tag.parentId);
        if (parent) {
          parent.children.push(tagMap.get(tag.id) as TagTree);
        } else {
          // Fallback por si hay orfandad lógica, lo tratamos como root
          rootTags.push(tagMap.get(tag.id) as TagTree);
        }
      } else {
        rootTags.push(tagMap.get(tag.id) as TagTree);
      }
    });

    return rootTags;
  }

  async findOne(id: string, withTree: boolean = false) {
    if (!withTree) {
      const tag = await this.prisma.tag.findUnique({
        where: { id },
        include: {
          _count: {
            select: { products: { where: { isActive: true } } },
          },
        },
      });
      if (!tag)
        throw new NotFoundException(`Etiqueta con ID ${id} no encontrada`);
      return tag;
    }

    // Si pide el árbol completo (hijos infinitos), usamos el mapa en memoria
    const allTags = await this.prisma.tag.findMany({
      include: {
        _count: {
          select: { products: { where: { isActive: true } } },
        },
      },
    });

    type TagWithCount = (typeof allTags)[0];
    type TagTree = TagWithCount & { children: TagTree[] };

    const tagMap = new Map<string, TagTree>();
    allTags.forEach((tag) => {
      tagMap.set(tag.id, { ...tag, children: [] });
    });

    allTags.forEach((tag) => {
      if (tag.parentId) {
        const parent = tagMap.get(tag.parentId);
        if (parent) {
          parent.children.push(tagMap.get(tag.id) as TagTree);
        }
      }
    });

    const requestedTag = tagMap.get(id);
    if (!requestedTag) {
      throw new NotFoundException(`Etiqueta con ID ${id} no encontrada`);
    }

    return requestedTag;
  }

  async update(id: string, dto: import('./dto/update-tag.dto').UpdateTagDto) {
    if (dto.parentId && dto.parentId === id) {
      throw new ConflictException(
        'Una etiqueta no puede ser padre de sí misma',
      );
    }

    return this.prisma.tag.update({
      where: { id },
      data: {
        name: dto.name,
        parentId: dto.parentId,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.tag.delete({ where: { id } });
  }
}
