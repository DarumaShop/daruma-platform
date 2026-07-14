import { Test, TestingModule } from '@nestjs/testing';
import { TagsService } from './tags.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TagsService', () => {
  let service: TagsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    tag: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateSlug', () => {
    it('Debería retornar { available: true } si el slug no existe en la base de datos', async () => {
      (prisma.tag.findUnique as jest.Mock).mockResolvedValue(null);

      const resultado = await service.validateSlug('slug-nuevo');

      expect(resultado).toEqual({ available: true });
      expect(prisma.tag.findUnique).toHaveBeenCalledWith({
        where: { slug: 'slug-nuevo' },
        select: { id: true },
      });
      expect(prisma.tag.findUnique).toHaveBeenCalledTimes(1);
    });

    it('Debería retornar { available: false } si el slug YA existe en la base de datos', async () => {
      (prisma.tag.findUnique as jest.Mock).mockResolvedValue({ id: '12345' });

      const resultado = await service.validateSlug('slug-ocupado');

      expect(resultado).toEqual({ available: false });
      expect(prisma.tag.findUnique).toHaveBeenCalledWith({
        where: { slug: 'slug-ocupado' },
        select: { id: true },
      });
      expect(prisma.tag.findUnique).toHaveBeenCalledTimes(1);
    });
  });
});
