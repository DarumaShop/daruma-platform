import { Test, TestingModule } from '@nestjs/testing';
import { ValidateSlugService } from './validate-slug.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ValidateSlugService', () => {
  let service: ValidateSlugService;
  let prisma: PrismaService;

  const mockPrismaService = {
    tag: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidateSlugService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ValidateSlugService>(ValidateSlugService);
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
