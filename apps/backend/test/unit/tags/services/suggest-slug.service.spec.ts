import { Test, TestingModule } from '@nestjs/testing';
import { SuggestSlugService } from '../../../../src/tags/services/suggest-slug.service';
import { PrismaService } from '../../../../src/prisma/prisma.service';

describe('SuggestSlugService', () => {
  let service: SuggestSlugService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuggestSlugService,
        {
          provide: PrismaService,
          useValue: {
            tag: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<SuggestSlugService>(SuggestSlugService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('suggestSlug', () => {
    it('Debería retornar un slug vacío si no se provee nombre', async () => {
      const result = await service.suggestSlug('');
      expect(result).toEqual({ slug: '' });
      expect(prismaService.tag.findUnique).not.toHaveBeenCalled();
    });

    it('Debería retornar el base slug si no existe colisión', async () => {
      (prismaService.tag.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.suggestSlug('Mi Etiqueta');
      expect(result).toEqual({ slug: 'mi-etiqueta' });
      expect(prismaService.tag.findUnique).toHaveBeenCalledWith({
        where: { slug: 'mi-etiqueta' },
        select: { id: true, slug: true },
      });
    });

    it('Debería retornar el base slug si colisiona pero es igual a ignoreSlug', async () => {
      (prismaService.tag.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        slug: 'mi-etiqueta',
      });

      const result = await service.suggestSlug('Mi Etiqueta', 'mi-etiqueta');
      expect(result).toEqual({ slug: 'mi-etiqueta' });
    });

    it('Debería generar un slug con sufijo si hay colisión', async () => {
      // Primera llamada: colisiona. Segunda llamada: no colisiona.
      (prismaService.tag.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: '1', slug: 'mi-etiqueta' }) // counter = 1
        .mockResolvedValueOnce(null); // success

      const result = await service.suggestSlug('Mi Etiqueta');
      expect(result).toEqual({ slug: 'mi-etiqueta-2' });
      expect(prismaService.tag.findUnique).toHaveBeenCalledTimes(2);
    });
  });
});
