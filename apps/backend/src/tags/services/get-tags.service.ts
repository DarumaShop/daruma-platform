import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GetTagsService {
  constructor(private readonly prisma: PrismaService) {}

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
      return allTags.map((tag) => {
        const rest = { ...tag };
        delete (rest as Partial<typeof rest>).id;
        delete (rest as Partial<typeof rest>).parentId;
        return rest;
      });
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

    type CleanTagNode = Omit<TagTree, 'id' | 'parentId' | 'children'> & {
      children: CleanTagNode[];
    };

    const cleanTree = (nodes: TagTree[]): CleanTagNode[] => {
      return nodes.map((node) => {
        const rest = { ...node, children: cleanTree(node.children) };
        delete (rest as Partial<typeof rest>).id;
        delete (rest as Partial<typeof rest>).parentId;
        return rest;
      });
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

    type CleanTagNode = Omit<TagTree, 'id' | 'parentId' | 'children'> & {
      children: CleanTagNode[];
    };

    const cleanTree = (node: TagTree): CleanTagNode => {
      const rest = { ...node, children: node.children.map(cleanTree) };
      delete (rest as Partial<typeof rest>).id;
      delete (rest as Partial<typeof rest>).parentId;
      return rest;
    };

    return cleanTree(requestedTag);
  }
}
