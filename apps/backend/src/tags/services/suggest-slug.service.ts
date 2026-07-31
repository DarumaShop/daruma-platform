import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import slugify from 'slugify';

@Injectable()
export class SuggestSlugService {
  constructor(private readonly prisma: PrismaService) {}

  async suggestSlug(
    name: string,
    ignoreSlug?: string,
  ): Promise<{ slug: string }> {
    if (!name) return { slug: '' };

    const baseSlug = slugify(name, { lower: true, strict: true });
    let tempSlug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.tag.findUnique({
        where: { slug: tempSlug },
        select: { id: true, slug: true },
      });

      // Si no existe, o si es exactamente el slug de la etiqueta que estamos editando
      if (!existing || existing.slug === ignoreSlug) {
        break;
      }

      counter++;
      tempSlug = `${baseSlug}-${counter}`;
    }

    return { slug: tempSlug };
  }
}
