import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DeleteTagService {
  constructor(private readonly prisma: PrismaService) {}

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
