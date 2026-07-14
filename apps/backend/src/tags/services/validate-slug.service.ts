import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ValidateSlugService {
  constructor(private readonly prisma: PrismaService) {}

  async validateSlug(slug: string): Promise<{ available: boolean }> {
    const existing = await this.prisma.tag.findUnique({
      where: { slug },
      select: { id: true },
    });
    return { available: !existing };
  }
}
