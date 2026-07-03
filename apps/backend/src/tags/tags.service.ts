import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';
import slugify from 'slugify';

@Injectable()
export class TagsService {
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

  async validateSlug(slug: string): Promise<{ available: boolean }> {
    const existing = await this.prisma.tag.findUnique({
      where: { slug },
      select: { id: true },
    });
    return { available: !existing };
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

    if (search) {
      return allTags.map(({ id, parentId, ...rest }) => rest);
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
          rootTags.push(tagMap.get(tag.id) as TagTree);
        }
      } else {
        rootTags.push(tagMap.get(tag.id) as TagTree);
      }
    });

    // Ocultar IDs explícitamente al retornar
    const cleanTree = (nodes: TagTree[]): any[] => {
      return nodes.map(({ id, parentId, children, ...rest }) => ({
        ...rest,
        children: cleanTree(children),
      }));
    };

    return cleanTree(rootTags);
  }

  async findOne(slug: string, withTree: boolean = false) {
    if (!withTree) {
      const tag = await this.prisma.tag.findUnique({
        where: { slug },
        omit: { id: true, parentId: true },
        include: {
          _count: {
            select: { products: { where: { isActive: true } } },
          },
        },
      });
      if (!tag)
        throw new NotFoundException(`Etiqueta con slug ${slug} no encontrada`);
      return tag;
    }

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
    let requestedTag: TagTree | null = null;

    allTags.forEach((tag) => {
      const tagNode = { ...tag, children: [] };
      tagMap.set(tag.id, tagNode);
      if (tag.slug === slug) {
        requestedTag = tagNode;
      }
    });

    if (!requestedTag) {
      throw new NotFoundException(`Etiqueta con slug ${slug} no encontrada`);
    }

    allTags.forEach((tag) => {
      if (tag.parentId) {
        const parent = tagMap.get(tag.parentId);
        if (parent) {
          parent.children.push(tagMap.get(tag.id) as TagTree);
        }
      }
    });

    const cleanTree = (node: TagTree): any => {
      const { id, parentId, children, ...rest } = node;
      return {
        ...rest,
        children: children.map(cleanTree),
      };
    };

    return cleanTree(requestedTag);
  }

  async update(slug: string, dto: import('./dto/update-tag.dto').UpdateTagDto) {
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
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('El slug de la etiqueta ya está en uso');
      }
      throw error;
    }
  }

  async remove(slug: string) {
    const existingTag = await this.prisma.tag.findUnique({ where: { slug } });
    if (!existingTag) {
      throw new NotFoundException(`Etiqueta con slug ${slug} no encontrada`);
    }
    const result = await this.prisma.tag.delete({
      where: { id: existingTag.id },
      omit: { id: true, parentId: true },
    });
    return result;
  }
}
