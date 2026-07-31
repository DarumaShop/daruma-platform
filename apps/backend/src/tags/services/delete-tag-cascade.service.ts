import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DeleteTagCascadeService {
  constructor(private readonly prisma: PrismaService) {}

  async removeCascade(slug: string) {
    // 1. Obtener todas las etiquetas para construir el árbol en memoria
    const allTags = await this.prisma.tag.findMany();

    type TagNode = typeof allTags[0] & { children: TagNode[] };

    // 2. Construir el árbol y encontrar el nodo raíz a eliminar
    const tagMap = new Map<string, TagNode>();
    allTags.forEach((tag) => tagMap.set(tag.id, { ...tag, children: [] }));

    let rootTag: TagNode | null = null;
    allTags.forEach((tag) => {
      if (tag.slug === slug) rootTag = tagMap.get(tag.id) || null;
      if (tag.parentId) {
        const parent = tagMap.get(tag.parentId);
        const child = tagMap.get(tag.id);
        if (parent && child) parent.children.push(child);
      }
    });

    if (!rootTag) {
      throw new NotFoundException(`Etiqueta con slug ${slug} no encontrada`);
    }

    // 3. Extraer todos los IDs de la etiqueta y sus descendientes
    const idsToDelete: string[] = [];
    const extractIds = (node: TagNode) => {
      idsToDelete.push(node.id);
      node.children.forEach(extractIds);
    };
    extractIds(rootTag);

    // 4. Eliminar todas las etiquetas extraídas
    const result = await this.prisma.tag.deleteMany({
      where: { id: { in: idsToDelete } },
    });

    return {
      message: `Se eliminaron ${result.count} etiquetas en cascada`,
      deletedCount: result.count,
    };
  }
}
